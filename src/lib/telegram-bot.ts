import { computeFinance } from "@/lib/finance";
import { createAdminClient } from "@/lib/supabase/admin";
import { tgSend, parsePurchase } from "@/lib/telegram";

/**
 * Логика Telegram-бота «Деньги под контролем» — ежедневный финансовый дневник.
 *
 * Бот связан с аккаунтом на сайте: подтягивает бюджет и цель из последнего
 * расчёта, пользователь каждый день пишет траты (просто число), бот ведёт месяц
 * и говорит: сколько можно тратить, сколько осталось копить, когда обновить бюджет.
 *
 * Эту же логику переиспользуют вебхук (входящие сообщения) и cron (напоминания).
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kapkapmoney.ru";

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const pluralMonths = (n: number) =>
  n % 10 === 1 && n % 100 !== 11
    ? "месяц"
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? "месяца"
      : "месяцев";
const pluralDays = (n: number) =>
  n % 10 === 1 && n % 100 !== 11
    ? "день"
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? "дня"
      : "дней";

// ── Время в МСК (сервер может быть в UTC) ──────────────────────────────
function mskNow(): Date {
  // сдвигаем на +3 и читаем через getUTC* — так получаем «московские» поля
  return new Date(Date.now() + 3 * 3600 * 1000);
}
function mskToday(): string {
  return mskNow().toISOString().slice(0, 10);
}
function mskMonthStart(): string {
  const d = mskNow();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
function mskDaysLeftInMonth(): number {
  const d = mskNow();
  const total = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return total - d.getUTCDate() + 1; // включая сегодня
}
function mskHour(): number {
  return mskNow().getUTCHours();
}
function mskYesterday(): string {
  return new Date(Date.now() + 3 * 3600 * 1000 - 24 * 3600 * 1000).toISOString().slice(0, 10);
}

// ── Тип пользователя бота ──────────────────────────────────────────────
export type TgUser = {
  tg_id: number;
  income: number;
  mandatory: number;
  savings: number;
  step: string | null;
  user_id: string | null;
  goal_name: string | null;
  goal_target: number;
  goal_saved: number;
  synced_at: string | null;
  remind_daily: boolean;
  last_remind_on: string | null;
};

const EMPTY = (tgId: number): TgUser => ({
  tg_id: tgId,
  income: 0,
  mandatory: 0,
  savings: 0,
  step: null,
  user_id: null,
  goal_name: null,
  goal_target: 0,
  goal_saved: 0,
  synced_at: null,
  remind_daily: true,
  last_remind_on: null,
});

async function getUser(tgId: number): Promise<TgUser> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("telegram_users").select("*").eq("tg_id", tgId).maybeSingle();
  if (data) return { ...EMPTY(tgId), ...(data as Partial<TgUser>) };
  await supabase.from("telegram_users").insert({ tg_id: tgId });
  return EMPTY(tgId);
}

async function patchUser(tgId: number, patch: Partial<TgUser>) {
  const supabase = createAdminClient();
  await supabase
    .from("telegram_users")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("tg_id", tgId);
}

// ── Расчёты и леджер ───────────────────────────────────────────────────
export type LedgerKind = "expense" | "income";

/** Свободно на месяц = доход − обязательные − откладываю (тот же якорь, что на сайте). */
function freeFromBudget(income: number, mandatory: number, savings: number): number {
  return computeFinance({
    incomeMonthly: income,
    mandatoryMonthly: mandatory,
    savingsMonthly: savings,
    currentBalance: 0,
    minimumBalance: 0,
    plannedVariableMonthly: 0,
  }).core.freeBudgetMonthly;
}
function freeOf(u: TgUser): number {
  return freeFromBudget(u.income, u.mandatory, u.savings);
}

/** Ключ агрегации леджера: по аккаунту (если привязан), иначе по чату Telegram. */
type LedgerKey = { userId?: string | null; tgId?: number | null };
function keyOf(u: TgUser): LedgerKey {
  return u.user_id ? { userId: u.user_id } : { tgId: u.tg_id };
}

/** Σ трат и Σ разовых доходов за текущий месяц. */
async function ledgerTotals(key: LedgerKey): Promise<{ expense: number; income: number }> {
  const supabase = createAdminClient();
  const base = supabase.from("tg_expenses").select("amount,kind").gte("day", mskMonthStart());
  const { data } = await (key.userId ? base.eq("user_id", key.userId) : base.eq("tg_id", key.tgId as number));
  let expense = 0;
  let income = 0;
  for (const r of (data ?? []) as { amount: number; kind: string }[]) {
    if (r.kind === "income") income += r.amount || 0;
    else expense += r.amount || 0;
  }
  return { expense, income };
}

/** Σ трат за конкретный день (для «сегодня/вчера» в сообщениях). */
async function dayExpense(key: LedgerKey, day: string): Promise<number> {
  const supabase = createAdminClient();
  const base = supabase.from("tg_expenses").select("amount,kind").eq("day", day);
  const { data } = await (key.userId ? base.eq("user_id", key.userId) : base.eq("tg_id", key.tgId as number));
  return (data ?? [])
    .filter((r) => (r as { kind: string }).kind !== "income")
    .reduce((s, r) => s + ((r as { amount: number }).amount || 0), 0);
}

async function logEntry(u: TgUser, amount: number, note: string | null, kind: LedgerKind, source = "tg") {
  const supabase = createAdminClient();
  await supabase.from("tg_expenses").insert({
    tg_id: u.tg_id,
    user_id: u.user_id,
    amount: Math.round(Math.abs(amount)),
    note: note || null,
    kind,
    source,
    day: mskToday(),
  });
}

async function undoLastToday(u: TgUser): Promise<{ amount: number; kind: string } | null> {
  const supabase = createAdminClient();
  const key = keyOf(u);
  const base = supabase.from("tg_expenses").select("id,amount,kind").eq("day", mskToday());
  const { data } = await (key.userId ? base.eq("user_id", key.userId) : base.eq("tg_id", key.tgId as number))
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const row = data as { id: number; amount: number; kind: string };
  await supabase.from("tg_expenses").delete().eq("id", row.id);
  return { amount: row.amount, kind: row.kind };
}

// ── Тексты ─────────────────────────────────────────────────────────────
const KB = {
  keyboard: [
    ["➖ Трата", "📊 Остаток"],
    ["🎯 Цель", "🛒 Можно купить?"],
    ["🔄 Обновить с сайта", "ℹ️ Помощь"],
  ],
};

function goalLine(u: TgUser): string | null {
  if (u.goal_target <= 0) return null;
  const remaining = Math.max(0, u.goal_target - u.goal_saved);
  const pct = Math.min(100, Math.round((u.goal_saved / u.goal_target) * 100));
  const name = u.goal_name ? `«${u.goal_name}»` : "цель";
  if (remaining <= 0) return `🎯 ${name}: накоплено! ${fmt(u.goal_target)} ✅`;
  const months = u.savings > 0 ? Math.ceil(remaining / u.savings) : null;
  const eta = months ? ` · ≈ ${months} ${pluralMonths(months)}` : "";
  return `🎯 ${name}: ${fmt(u.goal_saved)} из ${fmt(u.goal_target)} (${pct}%) · осталось ${fmt(remaining)}${eta}`;
}

async function statusText(u: TgUser): Promise<string> {
  const free = freeOf(u);
  const { expense, income } = await ledgerTotals(keyOf(u));
  const remaining = free - expense + income;
  const daysLeft = mskDaysLeftInMonth();
  const perDay = remaining > 0 ? Math.round(remaining / daysLeft) : 0;
  const today = await dayExpense(keyOf(u), mskToday());

  let head: string;
  if (remaining < 0) {
    head = `🔴 Перерасход ${fmt(-remaining)} сверх свободных ${fmt(free)} за месяц.`;
  } else if (remaining < free * 0.15) {
    head = `🟡 Осталось ${fmt(remaining)} на ${daysLeft} ${pluralDays(daysLeft)} — ужмись.`;
  } else {
    head = `🟢 Можно тратить ещё ${fmt(remaining)} до конца месяца.`;
  }

  const lines = [
    `📊 <b>Этот месяц</b>`,
    head,
    ``,
    `Свободно на месяц: ${fmt(free)}`,
    `Потрачено: ${fmt(expense)} (сегодня ${fmt(today)})`,
  ];
  if (income > 0) lines.push(`Разовый доход: +${fmt(income)}`);
  lines.push(
    `Осталось: <b>${fmt(Math.max(0, remaining))}</b> ≈ ${fmt(perDay)}/день · ${daysLeft} ${pluralDays(daysLeft)}`,
  );
  const g = goalLine(u);
  if (g) lines.push(``, g);
  return lines.join("\n");
}

function planText(u: TgUser): string {
  const free = freeOf(u);
  const perDay = Math.max(0, Math.round(free / 30));
  const lines = [
    `💰 <b>Твой бюджет</b>`,
    `Доход: ${fmt(u.income)} · Обязательные: ${fmt(u.mandatory)}` +
      (u.savings > 0 ? ` · Откладываешь: ${fmt(u.savings)}` : ""),
    ``,
    `<b>Свободно: ${fmt(free)}/мес</b> (≈ ${fmt(perDay)} в день)`,
  ];
  const g = goalLine(u);
  if (g) lines.push(g);
  lines.push(``, `Записывай траты — просто пришли сумму (<i>кофе 300</i>).`);
  return lines.join("\n");
}

function verdict(u: TgUser, price: number, label: string): string {
  const free = freeOf(u);
  if (free <= 0) {
    return `🔴 <b>${label} — ${fmt(price)}</b>\nСвободных денег нет: доход не покрывает обязательные. Сначала /setup.`;
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

function staleBudgetNote(u: TgUser): string | null {
  if (!u.user_id) return null;
  if (!u.synced_at) return null;
  const ageDays = (Date.now() - new Date(u.synced_at).getTime()) / (24 * 3600 * 1000);
  if (ageDays < 30) return null;
  return `🔔 Бюджет не обновлялся больше месяца. Актуализируй на сайте (${SITE}/app) и нажми «🔄 Обновить с сайта».`;
}

// ── Привязка аккаунта + синхронизация бюджета и цели ───────────────────
type Payload = {
  budget?: { incomeMonthly?: number; mandatoryMonthly?: number; savingsMonthly?: number };
  savingsGoal?: { goalName?: string; targetAmount?: number; currentSaved?: number };
};

async function latestPayload(userId: string): Promise<Payload | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("calculations")
    .select("payload")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { payload?: Payload } | null)?.payload ?? null;
}

function patchFromPayload(p: Payload | null): Partial<TgUser> {
  const b = p?.budget;
  const g = p?.savingsGoal;
  return {
    income: Math.round(b?.incomeMonthly ?? 0),
    mandatory: Math.round(b?.mandatoryMonthly ?? 0),
    savings: Math.round(b?.savingsMonthly ?? 0),
    goal_name: g?.goalName || null,
    goal_target: Math.round(g?.targetAmount ?? 0),
    goal_saved: Math.round(g?.currentSaved ?? 0),
    synced_at: new Date().toISOString(),
  };
}

async function linkAccount(u: TgUser, code: string) {
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("tg_link_codes")
    .select("user_id")
    .eq("code", code)
    .maybeSingle();

  if (!row) {
    await tgSend(u.tg_id, `⚠️ Ссылка привязки устарела. Получите новую на сайте: ${SITE}/account`);
    return;
  }
  const userId = (row as { user_id: string }).user_id;
  const payload = await latestPayload(userId);

  await patchUser(u.tg_id, { user_id: userId, step: null, ...patchFromPayload(payload) });
  await supabase.from("tg_link_codes").delete().eq("code", code);

  const fresh = await getUser(u.tg_id);
  if (fresh.income > 0) {
    await tgSend(
      u.tg_id,
      `✅ Аккаунт привязан! Подтянул бюджет и цель.\n\n${planText(fresh)}`,
      { keyboard: KB.keyboard },
    );
  } else {
    await tgSend(
      u.tg_id,
      `✅ Аккаунт привязан! Сохрани расчёт на сайте (${SITE}/app) — и нажми «🔄 Обновить с сайта». Или настрой здесь: /setup`,
      { keyboard: KB.keyboard },
    );
  }
}

async function syncFromSite(u: TgUser): Promise<boolean> {
  if (!u.user_id) return false;
  const payload = await latestPayload(u.user_id);
  if (!payload?.budget) return false;
  await patchUser(u.tg_id, patchFromPayload(payload));
  return true;
}

// ── Главный обработчик входящих сообщений ──────────────────────────────
const BTN: Record<string, string> = {
  "➖ трата": "/spent",
  "📊 остаток": "/left",
  "🎯 цель": "/goal",
  "🛒 можно купить?": "/buy",
  "🔄 обновить с сайта": "/sync",
  "ℹ️ помощь": "/help",
};

export async function handleMessage(chatId: number, rawText: string) {
  const u = await getUser(chatId);
  const t = rawText.trim();
  const lowerRaw = t.toLowerCase();
  // нормализуем нажатия кнопок в команды
  const lower = BTN[lowerRaw] ?? lowerRaw;

  // /start [code]
  if (lower.startsWith("/start")) {
    const code = t.split(/\s+/)[1];
    if (code) {
      await linkAccount(u, code);
      return;
    }
    await patchUser(chatId, { step: null });
    await tgSend(
      chatId,
      `👋 Привет! Я твой денежный дневник.\n\n` +
        `Каждый день пиши, сколько потратил — просто пришли сумму (<i>кофе 300</i>). Я веду месяц и говорю, сколько ещё можно тратить и сколько осталось копить.\n\n` +
        `1. Привяжи аккаунт с сайта (${SITE}/account) — подтяну бюджет и цель.\n` +
        `2. Или настрой бюджет здесь — /setup\n\n` +
        `Кнопки внизу: 📊 Остаток · 🎯 Цель · 🛒 Можно купить?`,
      { keyboard: KB.keyboard },
    );
    return;
  }

  if (lower === "/help") {
    await tgSend(
      chatId,
      `ℹ️ <b>Как пользоваться</b>\n\n` +
        `• Пиши траты — <i>500</i> или <i>кофе 300</i>. Я веду месяц.\n` +
        `• Прилетели деньги? Пиши <i>+5000 премия</i> — разовый доход.\n` +
        `• 📊 Остаток — сколько ещё можно тратить и в день\n` +
        `• 🎯 Цель — сколько осталось копить\n` +
        `• 🛒 Можно купить? — проверю крупную покупку\n` +
        `• /undo — удалить последнюю запись\n` +
        `• /setup — настроить бюджет вручную\n` +
        `• 🔄 Обновить с сайта — подтянуть свежий бюджет и цель\n\n` +
        `Полная версия (категории, история, графики): ${SITE}?utm_source=tg`,
      { keyboard: KB.keyboard },
    );
    return;
  }

  if (lower === "/setup") {
    await patchUser(chatId, { step: "income" });
    await tgSend(chatId, `Шаг 1/3. Сколько получаешь в месяц? Напиши число, например <i>80000</i>`);
    return;
  }

  if (lower === "/sync") {
    const ok = await syncFromSite(u);
    if (!ok) {
      await tgSend(
        chatId,
        u.user_id
          ? `Пока нет сохранённого расчёта на сайте. Открой ${SITE}/app, посчитай и сохрани — потом нажми «🔄 Обновить с сайта».`
          : `Сначала привяжи аккаунт: открой ${SITE}/account → «Подключить Telegram-бота».`,
        { keyboard: KB.keyboard },
      );
      return;
    }
    const fresh = await getUser(chatId);
    await tgSend(chatId, `🔄 Обновил бюджет и цель с сайта.\n\n${planText(fresh)}`, { keyboard: KB.keyboard });
    return;
  }

  if (lower === "/plan") {
    if (u.income <= 0) {
      await tgSend(chatId, `Сначала настрой бюджет — /setup или привяжи аккаунт (${SITE}/account)`);
      return;
    }
    await tgSend(chatId, planText(u), { keyboard: KB.keyboard });
    return;
  }

  if (lower === "/left") {
    if (u.income <= 0) {
      await tgSend(chatId, `Сначала настрой бюджет — /setup или привяжи аккаунт (${SITE}/account)`);
      return;
    }
    await tgSend(chatId, await statusText(u), { keyboard: KB.keyboard });
    return;
  }

  if (lower === "/goal") {
    const g = goalLine(u);
    if (!g) {
      await tgSend(
        chatId,
        `Цель не задана. Поставь её на сайте (${SITE}/app, вкладка «Накопить») и нажми «🔄 Обновить с сайта» — буду показывать прогресс.`,
        { keyboard: KB.keyboard },
      );
      return;
    }
    const remaining = Math.max(0, u.goal_target - u.goal_saved);
    const months = u.savings > 0 && remaining > 0 ? Math.ceil(remaining / u.savings) : null;
    await tgSend(
      chatId,
      `${g}` +
        (months ? `\n\nОткладывай по ${fmt(u.savings)}/мес — будет через ${months} ${pluralMonths(months)}.` : ``) +
        `\n\nОбновить накопленное — на сайте (${SITE}/app).`,
      { keyboard: KB.keyboard },
    );
    return;
  }

  if (lower === "/buy") {
    await patchUser(chatId, { step: "buy" });
    await tgSend(chatId, `🛒 Что хочешь купить? Напиши <i>название цена</i>, например <i>кроссовки 8000</i>`);
    return;
  }

  if (lower === "/undo") {
    const removed = await undoLastToday(u);
    if (removed == null) {
      await tgSend(chatId, `Сегодня записей ещё нет.`, { keyboard: KB.keyboard });
      return;
    }
    const what = removed.kind === "income" ? "разовый доход" : "трату";
    await tgSend(chatId, `↩️ Удалил последнюю ${what} ${fmt(removed.amount)}.\n\n${await statusText(await getUser(chatId))}`, {
      keyboard: KB.keyboard,
    });
    return;
  }

  // ── Шаги мастера настройки ──
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
    await patchUser(chatId, { savings: value, step: null });
    const fresh = await getUser(chatId);
    await tgSend(chatId, `Готово! ✅\n\n${planText(fresh)}`, { keyboard: KB.keyboard });
    return;
  }

  // ── Шаг «можно купить?» ──
  if (u.step === "buy") {
    await patchUser(chatId, { step: null });
    const parsed = parsePurchase(t);
    if (!parsed) {
      await tgSend(chatId, `Не понял цену. Напиши <i>название цена</i>, например <i>телефон 50000</i>.`, {
        keyboard: KB.keyboard,
      });
      return;
    }
    if (u.income <= 0) {
      await tgSend(chatId, `Сначала настрой бюджет — /setup.`, { keyboard: KB.keyboard });
      return;
    }
    await tgSend(chatId, verdict(u, parsed.amount, parsed.label), { keyboard: KB.keyboard });
    return;
  }

  // ── /spent — попросить сумму (или сразу «/spent 500 кофе») ──
  if (lower.startsWith("/spent")) {
    const rest = t.replace(/^\/spent\s*/i, "").trim();
    if (!rest) {
      await patchUser(chatId, { step: "spend" });
      await tgSend(chatId, `Сколько потратил? Пришли сумму, например <i>500</i> или <i>кофе 300</i>.`);
      return;
    }
    await recordEntry(chatId, rest, "expense");
    return;
  }

  if (u.step === "spend") {
    await patchUser(chatId, { step: null });
    await recordEntry(chatId, t, "expense");
    return;
  }

  // ── «+5000 премия» = разовый доход (прилетели деньги) ──
  if (t.startsWith("+")) {
    if (u.income <= 0) {
      await tgSend(
        chatId,
        `Сначала настрой бюджет — /setup или привяжи аккаунт (${SITE}/account).`,
        { keyboard: KB.keyboard },
      );
      return;
    }
    await recordEntry(chatId, t.slice(1).trim(), "income");
    return;
  }

  // ── Иначе: голое число / «кофе 300» = трата за сегодня (основной сценарий) ──
  const parsed = parsePurchase(t);
  if (parsed) {
    if (u.income <= 0) {
      await tgSend(
        chatId,
        `Сначала настрой бюджет — /setup или привяжи аккаунт (${SITE}/account), чтобы я считал остаток.`,
        { keyboard: KB.keyboard },
      );
      return;
    }
    await recordEntry(chatId, t, "expense");
    return;
  }

  await tgSend(
    chatId,
    `Не понял 🤔 Пиши траты суммой (<i>кофе 300</i>), или жми кнопки: 📊 Остаток · 🎯 Цель · 🛒 Можно купить?`,
    { keyboard: KB.keyboard },
  );
}

/** Записать запись леджера (трату или разовый доход) и показать остаток. */
async function recordEntry(chatId: number, text: string, kind: LedgerKind) {
  const u = await getUser(chatId);
  const parsed = parsePurchase(text);
  if (!parsed) {
    await tgSend(chatId, `Нужна сумма. Например <i>500</i> или <i>кофе 300</i>.`, { keyboard: KB.keyboard });
    return;
  }
  const note = parsed.label && parsed.label !== "покупка" ? parsed.label : null;
  await logEntry(u, parsed.amount, note, kind);

  const free = freeOf(u);
  const { expense, income } = await ledgerTotals(keyOf(u));
  const remaining = free - expense + income;
  const daysLeft = mskDaysLeftInMonth();
  const perDay = remaining > 0 ? Math.round(remaining / daysLeft) : 0;

  const noteLabel = note ? ` (${note})` : "";
  const tail =
    remaining < 0
      ? `🔴 Перерасход ${fmt(-remaining)}. До конца месяца лучше не тратить.`
      : `Осталось на месяц: <b>${fmt(remaining)}</b> ≈ ${fmt(perDay)}/день.`;
  const head =
    kind === "income"
      ? `💵 Записал разовый доход +${fmt(parsed.amount)}${noteLabel}.`
      : `✍️ Записал трату ${fmt(parsed.amount)}${noteLabel}.`;
  await tgSend(chatId, `${head}\n${tail}\n\n<i>Ошибся? /undo</i>`, { keyboard: KB.keyboard });
}

// ── Сводка и леджер для аккаунта (сайт ↔ бот) ──────────────────────────
export type MonthSummary = {
  /** есть бюджет (доход > 0) — можно считать остаток */
  hasBudget: boolean;
  /** привязан ли Telegram-бот к аккаунту */
  linked: boolean;
  income: number; // месячный доход
  free: number; // свободно на месяц (доход − обязательные − откладываю)
  spentMonth: number; // Σ трат за месяц
  extraIncome: number; // Σ разовых доходов за месяц
  remaining: number; // free − spent + extraIncome
  perDay: number;
  daysLeft: number;
  goalName: string | null;
  goalRemaining: number;
};

export type LedgerEntry = {
  id: number;
  kind: LedgerKind;
  amount: number;
  note: string | null;
  day: string;
  source: string;
};

/** Бюджет/цель аккаунта: из telegram_users (если привязан) или из последнего расчёта. */
async function accountBudget(userId: string): Promise<{
  tgId: number | null;
  income: number;
  mandatory: number;
  savings: number;
  goalName: string | null;
  goalTarget: number;
  goalSaved: number;
}> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("telegram_users")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data && (data as TgUser).income > 0) {
    const u = data as TgUser;
    return {
      tgId: u.tg_id,
      income: u.income,
      mandatory: u.mandatory,
      savings: u.savings,
      goalName: u.goal_name,
      goalTarget: u.goal_target,
      goalSaved: u.goal_saved,
    };
  }
  // нет привязки/бюджета в боте — берём из последнего сохранённого расчёта
  const p = await latestPayload(userId);
  const b = p?.budget;
  const g = p?.savingsGoal;
  return {
    tgId: (data as TgUser | null)?.tg_id ?? null,
    income: Math.round(b?.incomeMonthly ?? 0),
    mandatory: Math.round(b?.mandatoryMonthly ?? 0),
    savings: Math.round(b?.savingsMonthly ?? 0),
    goalName: g?.goalName || null,
    goalTarget: Math.round(g?.targetAmount ?? 0),
    goalSaved: Math.round(g?.currentSaved ?? 0),
  };
}

/** Полная сводка месяца для аккаунта (используют /account, калькулятор, API). */
export async function getMonthSummaryByUser(userId: string): Promise<MonthSummary> {
  const b = await accountBudget(userId);
  const free = freeFromBudget(b.income, b.mandatory, b.savings);
  const { expense, income } = await ledgerTotals({ userId });
  const remaining = free - expense + income;
  const daysLeft = mskDaysLeftInMonth();
  return {
    hasBudget: b.income > 0,
    linked: b.tgId != null,
    income: b.income,
    free,
    spentMonth: expense,
    extraIncome: income,
    remaining,
    perDay: remaining > 0 ? Math.round(remaining / daysLeft) : 0,
    daysLeft,
    goalName: b.goalName,
    goalRemaining: Math.max(0, b.goalTarget - b.goalSaved),
  };
}

/** Записи леджера аккаунта за текущий месяц (новые сверху). */
export async function getMonthEntries(userId: string): Promise<LedgerEntry[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tg_expenses")
    .select("id,kind,amount,note,day,source")
    .eq("user_id", userId)
    .gte("day", mskMonthStart())
    .order("id", { ascending: false })
    .limit(100);
  return (data ?? []) as LedgerEntry[];
}

/** Добавить разовую корректировку с сайта; если бот привязан — шлём отчёт. */
export async function addAdjustment(
  userId: string,
  kind: LedgerKind,
  amount: number,
  note: string | null,
): Promise<MonthSummary> {
  const supabase = createAdminClient();
  const b = await accountBudget(userId);
  const { error } = await supabase.from("tg_expenses").insert({
    user_id: userId,
    tg_id: b.tgId,
    amount: Math.round(Math.abs(amount)),
    note: note || null,
    kind,
    source: "web",
    day: mskToday(),
  });
  if (error) throw new Error(error.message);
  const summary = await getMonthSummaryByUser(userId);

  if (b.tgId) {
    const noteLabel = note ? ` (${note})` : "";
    const head =
      kind === "income"
        ? `💵 На сайте записан разовый доход +${fmt(Math.abs(amount))}${noteLabel}.`
        : `✍️ На сайте записана трата ${fmt(Math.abs(amount))}${noteLabel}.`;
    const tail =
      summary.remaining < 0
        ? `🔴 Перерасход ${fmt(-summary.remaining)} за месяц.`
        : `Осталось на месяц: <b>${fmt(summary.remaining)}</b> ≈ ${fmt(summary.perDay)}/день.`;
    await tgSend(b.tgId, `${head}\n${tail}`, { keyboard: KB.keyboard });
  }
  return summary;
}

/** Удалить запись леджера (только свою). */
export async function deleteEntry(userId: string, id: number): Promise<MonthSummary> {
  const supabase = createAdminClient();
  await supabase.from("tg_expenses").delete().eq("id", id).eq("user_id", userId);
  return getMonthSummaryByUser(userId);
}

/** Пуш бюджета+цели в бота после сохранения расчёта на сайте + отчёт. */
export async function pushBudgetToBot(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("telegram_users")
    .select("tg_id")
    .eq("user_id", userId)
    .maybeSingle();
  const tgId = (data as { tg_id: number } | null)?.tg_id;
  if (!tgId) return false; // бот не привязан — нечего пушить

  const payload = await latestPayload(userId);
  if (!payload?.budget) return false;
  await patchUser(tgId, patchFromPayload(payload));

  const fresh = await getUser(tgId);
  await tgSend(tgId, `🔄 Бюджет обновлён с сайта.\n\n${planText(fresh)}`, { keyboard: KB.keyboard });
  return true;
}

// ── Напоминания (вызывается из cron) ───────────────────────────────────
/**
 * Утренняя сводка (МСК 9–11): вчерашние траты, остаток месяца, прогресс цели,
 * напоминание обновить бюджет. Шлём не чаще раза в день на пользователя.
 * @param force — игнорировать проверку часа (для ручного теста)
 */
export async function sendDailyReminders(force = false): Promise<{ sent: number; skipped: string }> {
  const hour = mskHour();
  if (!force && (hour < 9 || hour > 11)) {
    return { sent: 0, skipped: `не время (МСК ${hour}:00, окно 9–11)` };
  }

  const supabase = createAdminClient();
  const today = mskToday();
  const { data } = await supabase
    .from("telegram_users")
    .select("*")
    .gt("income", 0)
    .eq("remind_daily", true);

  const users = ((data ?? []) as Partial<TgUser>[])
    .map((d) => ({ ...EMPTY(d.tg_id as number), ...d }))
    .filter((u) => u.last_remind_on !== today);

  let sent = 0;
  for (const u of users) {
    const free = freeOf(u);
    const { expense, income } = await ledgerTotals(keyOf(u));
    const remaining = free - expense + income;
    const daysLeft = mskDaysLeftInMonth();
    const perDay = remaining > 0 ? Math.round(remaining / daysLeft) : 0;
    const yest = await dayExpense(keyOf(u), mskYesterday());

    const lines = [
      `☀️ <b>Доброе утро!</b>`,
      yest > 0 ? `Вчера потратил: ${fmt(yest)}` : `Вчера трат не записал.`,
      remaining < 0
        ? `🔴 В этом месяце перерасход ${fmt(-remaining)}.`
        : `Осталось на месяц: <b>${fmt(remaining)}</b> ≈ ${fmt(perDay)}/день (${daysLeft} ${pluralDays(daysLeft)}).`,
    ];
    const g = goalLine(u);
    if (g) lines.push(g);
    const stale = staleBudgetNote(u);
    if (stale) lines.push(``, stale);
    lines.push(``, `Запиши траты за сегодня — просто пришли сумму.`);

    await tgSend(u.tg_id, lines.join("\n"), { keyboard: KB.keyboard });
    await patchUser(u.tg_id, { last_remind_on: today });
    sent++;
  }
  return { sent, skipped: "" };
}
