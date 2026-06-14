import { computeFinance } from "@/lib/finance";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { tgSend, parsePurchase, isTelegramConfigured } from "@/lib/telegram";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kapkapmoney.ru";
const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const pluralMonths = (n: number) =>
  n % 10 === 1 && n % 100 !== 11 ? "месяц" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "месяца" : "месяцев";

type TgUser = {
  tg_id: number;
  income: number;
  mandatory: number;
  savings: number;
  step: string | null;
  user_id: string | null;
};

async function getUser(tgId: number): Promise<TgUser> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("telegram_users").select("*").eq("tg_id", tgId).maybeSingle();
  if (data) return data as TgUser;
  await supabase.from("telegram_users").insert({ tg_id: tgId });
  return { tg_id: tgId, income: 0, mandatory: 0, savings: 0, step: null, user_id: null };
}

/** Привязка Telegram к аккаунту сайта по одноразовому коду + подтягивание бюджета. */
async function linkAccount(chatId: number, code: string) {
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("tg_link_codes")
    .select("user_id")
    .eq("code", code)
    .maybeSingle();

  if (!row) {
    await tgSend(chatId, `⚠️ Ссылка привязки устарела. Получите новую на сайте: ${SITE}/account`);
    return;
  }
  const userId = (row as { user_id: string }).user_id;

  // последний сохранённый расчёт пользователя
  const { data: calc } = await supabase
    .from("calculations")
    .select("payload")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const budget = (
    calc as { payload?: { budget?: { incomeMonthly?: number; mandatoryMonthly?: number; savingsMonthly?: number } } } | null
  )?.payload?.budget;

  await getUser(chatId);
  await patchUser(chatId, {
    user_id: userId,
    step: null,
    income: budget?.incomeMonthly ?? 0,
    mandatory: budget?.mandatoryMonthly ?? 0,
    savings: budget?.savingsMonthly ?? 0,
  });
  await supabase.from("tg_link_codes").delete().eq("code", code);

  const u = await getUser(chatId);
  if (u.income > 0) {
    await tgSend(chatId, `✅ Аккаунт привязан! Подтянул твой бюджет.\n\n${planText(u)}`);
  } else {
    await tgSend(
      chatId,
      `✅ Аккаунт привязан! Сохрани расчёт на сайте (${SITE}/app) — и я подтяну цифры. Или настрой здесь: /setup`,
    );
  }
}

async function patchUser(tgId: number, patch: Partial<TgUser>) {
  const supabase = createAdminClient();
  await supabase
    .from("telegram_users")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("tg_id", tgId);
}

function freeOf(u: TgUser): number {
  return computeFinance({
    incomeMonthly: u.income,
    mandatoryMonthly: u.mandatory,
    savingsMonthly: u.savings,
    currentBalance: 0,
    minimumBalance: 0,
    plannedVariableMonthly: 0,
  }).core.freeBudgetMonthly;
}

function planText(u: TgUser): string {
  const free = freeOf(u);
  const perDay = Math.max(0, Math.round(free / 30));
  return (
    `💰 <b>Твой бюджет</b>\n` +
    `Доход: ${fmt(u.income)} · Обязательные: ${fmt(u.mandatory)}` +
    (u.savings > 0 ? ` · Откладываешь: ${fmt(u.savings)}` : "") +
    `\n\n<b>Свободно: ${fmt(free)}/мес</b> (≈ ${fmt(perDay)} в день)\n\n` +
    `Напиши цену покупки, например: <i>кроссовки 8000</i>`
  );
}

function verdict(u: TgUser, price: number, label: string): string {
  const free = freeOf(u);
  if (free <= 0) {
    return `🔴 <b>${label} — ${fmt(price)}</b>\nСвободных денег нет: доход не покрывает обязательные. Сначала /setup или сократи траты.`;
  }
  if (price <= free) {
    return `🟢 <b>Можно купить: ${label} — ${fmt(price)}</b>\nПосле покупки на жизнь останется ${fmt(free - price)}/мес.`;
  }
  const months = Math.ceil(price / free);
  return (
    `🟡 <b>Дороговато: ${label} — ${fmt(price)}</b>\n` +
    `Не хватает ${fmt(price - free)} сверх свободных ${fmt(free)}.\n` +
    `Откладывай по ${fmt(free)}/мес — накопишь за ${months} ${pluralMonths(months)}.`
  );
}

async function handle(chatId: number, text: string) {
  const u = await getUser(chatId);
  const t = text.trim();
  const lower = t.toLowerCase();

  if (lower.startsWith("/start")) {
    const code = t.split(/\s+/)[1];
    if (code) {
      await linkAccount(chatId, code);
      return;
    }
    await patchUser(chatId, { step: null });
    await tgSend(
      chatId,
      `👋 Привет! Я подскажу, <b>можно ли тебе купить</b> что-то прямо сейчас.\n\n` +
        `1. Настрой бюджет — /setup\n` +
        `2. Пиши цену покупки (<i>кроссовки 8000</i>) — я дам ответ.\n\n` +
        `Команды: /plan — твой бюджет, /help — помощь.\n` +
        `Полная версия (категории, цели, история): ${SITE}?utm_source=tg`,
      { keyboard: [["/setup", "/plan"], ["/help"]] },
    );
    return;
  }

  if (lower === "/help") {
    await tgSend(
      chatId,
      `ℹ️ <b>Как пользоваться</b>\n\n` +
        `• /setup — настроить доход и траты\n` +
        `• Напиши цену (<i>телефон 50000</i>) — пойму, можно ли купить\n` +
        `• /plan — сколько у тебя свободно\n\n` +
        `Подробный план и цели — на сайте: ${SITE}?utm_source=tg`,
    );
    return;
  }

  if (lower === "/setup") {
    await patchUser(chatId, { step: "income" });
    await tgSend(chatId, `Шаг 1/3. Сколько получаешь в месяц? Напиши число, например <i>80000</i>`);
    return;
  }

  if (lower === "/plan") {
    if (u.income <= 0) {
      await tgSend(chatId, `Сначала настрой бюджет — /setup`);
      return;
    }
    await tgSend(chatId, planText(u));
    return;
  }

  // Шаги настройки
  if (u.step === "income" || u.step === "mandatory" || u.step === "savings") {
    const parsed = parsePurchase(t);
    const value = parsed?.amount ?? (/(^|\s)0(\s|$)/.test(t) ? 0 : null);
    if (value === null) {
      await tgSend(chatId, `Нужно число. Например <i>40000</i> (или 0).`);
      return;
    }
    if (u.step === "income") {
      await patchUser(chatId, { income: value, step: "mandatory" });
      await tgSend(chatId, `Шаг 2/3. Обязательные траты (аренда, кредиты, ЖКХ)? Например <i>40000</i>`);
      return;
    }
    if (u.step === "mandatory") {
      await patchUser(chatId, { mandatory: value, step: "savings" });
      await tgSend(chatId, `Шаг 3/3. Откладываешь в месяц? Если нет — напиши <i>0</i>`);
      return;
    }
    // savings
    await patchUser(chatId, { savings: value, step: null });
    await tgSend(chatId, `Готово! ✅\n\n` + planText({ ...u, savings: value }));
    return;
  }

  // Иначе — проверка покупки
  if (u.income <= 0) {
    await tgSend(chatId, `Сначала настрой бюджет — /setup (займёт 20 секунд).`);
    return;
  }
  const parsed = parsePurchase(t);
  if (!parsed) {
    await tgSend(chatId, `Напиши цену покупки, например: <i>кроссовки 8000</i>. Или /plan, /help.`);
    return;
  }
  await tgSend(chatId, verdict(u, parsed.amount, parsed.label));
}

export async function POST(request: Request) {
  // Безопасность: секрет вебхука Telegram
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  if (!isTelegramConfigured() || !isSupabaseAdminConfigured()) {
    return Response.json({ ok: true });
  }

  try {
    const update = await request.json();
    const msg = update?.message;
    if (msg?.text && msg.chat?.id) {
      await handle(msg.chat.id, msg.text);
    }
  } catch {
    /* всегда отвечаем 200, чтобы Telegram не ретраил бесконечно */
  }
  return Response.json({ ok: true });
}
