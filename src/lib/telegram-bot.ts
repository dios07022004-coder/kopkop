import { computeFinance, cycleBounds, hasPayday, allocateCategories, DEFAULT_CATEGORIES } from "@/lib/finance";
import type { BudgetCategory } from "@/lib/finance";
import { createAdminClient } from "@/lib/supabase/admin";
import { tgSend, tgAnswerCallback, parsePurchase } from "@/lib/telegram";
import { userHasPaidOrder } from "@/lib/orders";
import { isAdminEmail } from "@/lib/admin";
import { sendPushToUser, isPushConfigured } from "@/lib/push";

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
function mskDaysInMonth(): number {
  const d = mskNow();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}
function mskDaysLeftInMonth(): number {
  const d = mskNow();
  return mskDaysInMonth() - d.getUTCDate() + 1; // включая сегодня
}

/**
 * Дневная норма «сколько можно тратить в день».
 * - Цикл (задан день зарплаты): фикс. наличные должны дожить до ЗП → остаток / дней до ЗП.
 * - Календарный месяц: устойчивая дневная норма = свободно / дней в месяце
 *   (не «остаток / оставшиеся дни», иначе под конец месяца цифра неадекватно растёт).
 */
function dailyAllowance(cycleMode: boolean, free: number, remaining: number, daysLeft: number): number {
  if (cycleMode) return remaining > 0 ? Math.round(remaining / Math.max(1, daysLeft)) : 0;
  return free > 0 ? Math.round(free / mskDaysInMonth()) : 0;
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
  current_balance: number;
  min_balance: number;
  payday: number; // 0 = выключено (календарный месяц)
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
  current_balance: 0,
  min_balance: 0,
  payday: 0,
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

/** Есть ли у привязанного аккаунта оплата (или это админ). Без привязки — нет. */
async function hasPaidAccessForUser(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const supabase = createAdminClient();
  const { data } = await supabase.auth.admin.getUserById(userId);
  const email = data.user?.email;
  if (!email) return false;
  if (isAdminEmail(email)) return true;
  return userHasPaidOrder(email);
}

/** Сообщение-пейволл: как получить доступ в боте. */
function paywallText(linked: boolean): string {
  if (!linked) {
    return (
      `🔒 <b>Доступ к боту — после оплаты.</b>\n\n` +
      `1. Оформите доступ на сайте: ${SITE}\n` +
      `2. Затем откройте ${SITE}/account → «Подключить Telegram-бота» — я привяжусь к вашему аккаунту и подтяну бюджет.\n\n` +
      `После этого пишите траты сюда — я буду вести ваш месяц.`
    );
  }
  return (
    `🔒 <b>Доступ не оплачен.</b>\n\n` +
    `Ваш аккаунт привязан, но подписки нет. Оформите доступ: ${SITE}\n` +
    `После оплаты всё заработает автоматически — ничего больше делать не нужно.`
  );
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

/**
 * Период расчёта. Если задан день зарплаты — цикл [последняя ЗП … следующая ЗП),
 * иначе — календарный месяц. fromDay используется для агрегации леджера.
 */
type Period = { cycleMode: boolean; fromDay: string; daysLeft: number; nextPayday: string | null };
function periodOf(payday: number): Period {
  if (hasPayday(payday)) {
    const b = cycleBounds(payday, mskNow());
    return { cycleMode: true, fromDay: b.start, daysLeft: b.daysLeft, nextPayday: b.end };
  }
  return { cycleMode: false, fromDay: mskMonthStart(), daysLeft: mskDaysLeftInMonth(), nextPayday: null };
}

/** Σ трат и Σ разовых доходов за период (с fromDay включительно). */
async function ledgerTotals(key: LedgerKey, fromDay: string): Promise<{ expense: number; income: number }> {
  const supabase = createAdminClient();
  const base = supabase.from("tg_expenses").select("amount,kind").gte("day", fromDay);
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
    ["➖ Трата", "➕ Доход"],
    ["📊 Остаток", "🎯 Цель"],
    ["📋 Шаблоны", "🛒 Можно купить?"],
    ["🔄 Обновить", "ℹ️ Помощь"],
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

const fmtDate = (ymd: string) => `${ymd.slice(8, 10)}.${ymd.slice(5, 7)}`;

/** Единый расчёт остатка: цикл до зарплаты (если задан payday) или календарный месяц. */
async function computeStatus(u: TgUser) {
  const period = periodOf(u.payday);
  const { expense, income } = await ledgerTotals(keyOf(u), period.fromDay);
  const free = freeOf(u); // месячный якорь (доход − обязательные − откладываю)
  // база периода: в режиме цикла — деньги, доступные до зарплаты (счёт − подушка)
  const base = period.cycleMode ? Math.max(0, u.current_balance - u.min_balance) : free;
  const remaining = base - expense + income;
  const perDay = dailyAllowance(period.cycleMode, free, remaining, period.daysLeft);
  return { period, expense, income, free, base, remaining, perDay };
}

async function statusText(u: TgUser): Promise<string> {
  const s = await computeStatus(u);
  const today = await dayExpense(keyOf(u), mskToday());
  const dl = s.period.daysLeft;
  const g = goalLine(u);

  if (s.period.cycleMode) {
    const pd = s.period.nextPayday ? fmtDate(s.period.nextPayday) : "";
    let head: string;
    if (s.remaining < 0) head = `🔴 До зарплаты не хватает: минус ${fmt(-s.remaining)}.`;
    else if (s.remaining < s.base * 0.15) head = `🟡 До зарплаты осталось ${fmt(s.remaining)} — ужимайся.`;
    else head = `🟢 До зарплаты можно тратить ещё ${fmt(s.remaining)}.`;
    const lines = [
      `📊 <b>До зарплаты ${pd}</b> · ${dl} ${pluralDays(dl)}`,
      head,
      ``,
      `На счёте сейчас: ${fmt(u.current_balance)}` + (u.min_balance > 0 ? ` · подушка ${fmt(u.min_balance)}` : ``),
      `Потрачено в цикле: ${fmt(s.expense)} (сегодня ${fmt(today)})`,
    ];
    if (s.income > 0) lines.push(`Разовый доход: +${fmt(s.income)}`);
    lines.push(`Можно тратить: <b>${fmt(Math.max(0, s.remaining))}</b> ≈ ${fmt(s.perDay)}/день`);
    if (g) lines.push(``, g);
    return lines.join("\n");
  }

  let head: string;
  if (s.remaining < 0) {
    head = `🔴 Перерасход ${fmt(-s.remaining)} сверх свободных ${fmt(s.free)} за месяц.`;
  } else if (s.remaining < s.free * 0.15) {
    head = `🟡 Осталось ${fmt(s.remaining)} на ${dl} ${pluralDays(dl)} — ужмись.`;
  } else {
    head = `🟢 Можно тратить ещё ${fmt(s.remaining)} до конца месяца.`;
  }
  const lines = [
    `📊 <b>Этот месяц</b>`,
    head,
    ``,
    `Свободно на месяц: ${fmt(s.free)}`,
    `Потрачено: ${fmt(s.expense)} (сегодня ${fmt(today)})`,
  ];
  if (s.income > 0) lines.push(`Разовый доход: +${fmt(s.income)}`);
  lines.push(
    `Осталось: <b>${fmt(Math.max(0, s.remaining))}</b> ≈ ${fmt(s.perDay)}/день · ${dl} ${pluralDays(dl)}`,
  );
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
  budget?: {
    incomeMonthly?: number;
    mandatoryMonthly?: number;
    savingsMonthly?: number;
    currentBalance?: number;
    minimumBalance?: number;
    payday?: number;
    categories?: { id?: string; label?: string; percent?: number }[];
  };
  savingsGoal?: { goalName?: string; targetAmount?: number; currentSaved?: number };
  purchase?: { price?: number };
};

/** Явно выбранный активный шаблон аккаунта (или null). */
async function activeCalcId(userId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("account_settings")
    .select("active_calc_id")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { active_calc_id: string | null } | null)?.active_calc_id ?? null;
}

/** Payload активного шаблона (если выбран и существует), иначе — последнего сохранённого. */
async function latestPayload(userId: string): Promise<Payload | null> {
  const supabase = createAdminClient();
  const activeId = await activeCalcId(userId);
  if (activeId) {
    const { data } = await supabase
      .from("calculations")
      .select("payload")
      .eq("id", activeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return (data as { payload?: Payload }).payload ?? null;
  }
  const { data } = await supabase
    .from("calculations")
    .select("payload")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { payload?: Payload } | null)?.payload ?? null;
}

type Template = { id: string; label: string | null; free: number | null; payload: Payload };

/** Сохранённые расчёты (шаблоны) аккаунта — для выбора в боте. */
async function listTemplates(userId: string): Promise<Template[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("calculations")
    .select("id,label,free,payload")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);
  return (data ?? []) as Template[];
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
    current_balance: Math.round(b?.currentBalance ?? 0),
    min_balance: Math.round(b?.minimumBalance ?? 0),
    payday: Math.round(b?.payday ?? 0),
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

  // Проверяем оплату привязанного аккаунта
  if (!(await hasPaidAccessForUser(userId))) {
    await tgSend(u.tg_id, `✅ Аккаунт привязан!\n\n${paywallText(true)}`, { keyboard: KB.keyboard });
    return;
  }

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
  "➕ доход": "/income",
  "📊 остаток": "/left",
  "🎯 цель": "/goal",
  "📋 шаблоны": "/templates",
  "🛒 можно купить?": "/buy",
  "🔄 обновить": "/sync",
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
        `Чтобы пользоваться, привяжи аккаунт: на сайте ${SITE}/account нажми «Подключить Telegram» и пришли мне сюда <b>код привязки</b>.\n\n` +
        `Кнопки внизу: 📊 Остаток · 🎯 Цель · 🛒 Можно купить?`,
      { keyboard: KB.keyboard },
    );
    return;
  }

  // Привязка по коду, присланному ТЕКСТОМ (надёжнее deep-link): 16 hex-символов
  if (/^[a-f0-9]{16}$/i.test(t)) {
    await linkAccount(u, t.toLowerCase());
    return;
  }

  if (lower === "/help") {
    await tgSend(
      chatId,
      `ℹ️ <b>Как пользоваться</b> (всё на кнопках внизу)\n\n` +
        `• <b>➖ Трата</b> — записать трату (или просто пришли <i>кофе 300</i>)\n` +
        `• <b>➕ Доход</b> — записать пришедшие деньги (или <i>+5000 премия</i>)\n` +
        `• <b>📊 Остаток</b> — сколько ещё можно тратить и в день\n` +
        `• <b>🎯 Цель</b> — сколько осталось копить\n` +
        `• <b>📋 Шаблоны</b> — выбрать сохранённый расчёт как активный бюджет\n` +
        `• <b>🛒 Можно купить?</b> — проверю крупную покупку\n` +
        `• <b>🔄 Обновить</b> — подтянуть свежий бюджет и цель с сайта\n` +
        `• /undo — удалить последнюю запись\n\n` +
        `Полная версия (категории, история, графики): ${SITE}?utm_source=tg`,
      { keyboard: KB.keyboard },
    );
    return;
  }

  // ── Пейволл: всё ниже — только для оплативших (привязанный аккаунт с оплатой) ──
  if (!(await hasPaidAccessForUser(u.user_id))) {
    await tgSend(chatId, paywallText(Boolean(u.user_id)), { keyboard: KB.keyboard });
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

  // ── 📋 Шаблоны: выбор сохранённого расчёта (с датой) как активного бюджета ──
  if (lower === "/templates") {
    if (!u.user_id) {
      await tgSend(
        chatId,
        `Сначала привяжи аккаунт: открой ${SITE}/account → «Подключить Telegram-бота».`,
        { keyboard: KB.keyboard },
      );
      return;
    }
    const tpls = await listTemplates(u.user_id);
    if (!tpls.length) {
      await tgSend(
        chatId,
        `У тебя пока нет сохранённых шаблонов. Посчитай и нажми «Сохранить расчёт» на сайте (${SITE}/app) — он появится здесь. Либо настрой вручную: /setup`,
        { keyboard: KB.keyboard },
      );
      return;
    }
    const inline = tpls.map((t) => [
      {
        text: `${t.label || "Расчёт"} · ${fmt(t.free ?? 0)} своб.`,
        callback_data: `tpl:${t.id}`,
      },
    ]);
    await tgSend(chatId, `📋 <b>Твои шаблоны</b>\nВыбери активный — буду считать месяц по нему:`, {
      inlineKeyboard: inline,
    });
    return;
  }

  // ── ➕ Доход: разовый доход (или сразу «/income 5000 премия») ──
  if (lower.startsWith("/income")) {
    const rest = t.replace(/^\/income\s*/i, "").trim();
    if (!rest) {
      await patchUser(chatId, { step: "addincome" });
      await tgSend(chatId, `Сколько пришло? Пришли сумму, например <i>5000</i> или <i>премия 5000</i>.`);
      return;
    }
    await recordEntry(chatId, rest, "income");
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

  if (u.step === "addincome") {
    await patchUser(chatId, { step: null });
    await recordEntry(chatId, t, "income");
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
    `Не понял 🤔 Пиши траты суммой (<i>кофе 300</i>), доход — <i>+5000</i>, или жми кнопки внизу.`,
    { keyboard: KB.keyboard },
  );
}

/** Обработка нажатий инлайн-кнопок (callback_query), напр. выбор шаблона. */
export async function handleCallback(chatId: number, data: string, callbackId: string) {
  const u = await getUser(chatId);

  // пейволл — как и для сообщений
  if (!(await hasPaidAccessForUser(u.user_id))) {
    await tgAnswerCallback(callbackId, "Доступ только после оплаты");
    await tgSend(chatId, paywallText(Boolean(u.user_id)), { keyboard: KB.keyboard });
    return;
  }

  if (data.startsWith("tpl:")) {
    const id = data.slice(4);
    const supabase = createAdminClient();
    const { data: row } = await supabase
      .from("calculations")
      .select("label,payload")
      .eq("id", id)
      .eq("user_id", u.user_id as string)
      .maybeSingle();
    if (!row) {
      await tgAnswerCallback(callbackId, "Шаблон не найден");
      return;
    }
    const r = row as { label: string | null; payload: Payload };
    await patchUser(chatId, patchFromPayload(r.payload));
    await tgAnswerCallback(callbackId, "Шаблон применён ✅");
    const fresh = await getUser(chatId);
    await tgSend(
      chatId,
      `✅ Активный шаблон: <b>${r.label || "расчёт"}</b>\n\n${planText(fresh)}`,
      { keyboard: KB.keyboard },
    );
    return;
  }

  await tgAnswerCallback(callbackId);
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

  const s = await computeStatus(u);
  const noteLabel = note ? ` (${note})` : "";
  const horizon = s.period.cycleMode ? "до зарплаты" : "на месяц";
  const tail =
    s.remaining < 0
      ? `🔴 Перерасход ${fmt(-s.remaining)}. Лучше притормозить.`
      : `Осталось ${horizon}: <b>${fmt(s.remaining)}</b> ≈ ${fmt(s.perDay)}/день.`;
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
  spentMonth: number; // Σ трат за период
  spentToday: number; // Σ трат за сегодня
  extraIncome: number; // Σ разовых доходов за период
  remaining: number; // base − spent + extraIncome
  perDay: number;
  daysLeft: number;
  goalName: string | null;
  goalRemaining: number;
  /** режим «до зарплаты» (задан день зарплаты) */
  cycleMode: boolean;
  /** дата следующей зарплаты YYYY-MM-DD (в режиме цикла) */
  nextPayday: string | null;
  /** база периода: в цикле — доступно до зарплаты (счёт − подушка), иначе — free */
  base: number;
  /** распределение доступного по категориям (на что можно тратить) */
  categories: { label: string; amount: number; percent: number }[];
  /** планируемая крупная покупка из расчёта (если задана) */
  purchase: { price: number; gap: number; months: number | null } | null;
};

export type LedgerEntry = {
  id: number;
  kind: LedgerKind;
  amount: number;
  note: string | null;
  day: string;
  source: string;
};

type AccountBudget = {
  tgId: number | null;
  income: number;
  mandatory: number;
  savings: number;
  goalName: string | null;
  goalTarget: number;
  goalSaved: number;
  currentBalance: number;
  minBalance: number;
  payday: number;
  categories: BudgetCategory[];
  purchasePrice: number;
};

/** Категории трат из payload (или дефолтные). */
function categoriesFromPayload(p: Payload | null): BudgetCategory[] {
  const raw = p?.budget?.categories;
  if (!raw?.length) return DEFAULT_CATEGORIES;
  const cats = raw
    .filter((c) => c && (c.label || c.id) && Number(c.percent) > 0)
    .map((c, i) => ({
      id: c.id || `cat-${i}`,
      label: c.label || "Категория",
      percent: Math.max(0, Number(c.percent) || 0),
    }));
  return cats.length ? cats : DEFAULT_CATEGORIES;
}

/** Бюджет/цель аккаунта: из telegram_users (если привязан) или из последнего расчёта. */
async function accountBudget(userId: string): Promise<AccountBudget> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("telegram_users")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  // категории и покупку берём всегда из последнего расчёта (telegram_users их не хранит)
  const p = await latestPayload(userId);
  const categories = categoriesFromPayload(p);
  const purchasePrice = Math.round(p?.purchase?.price ?? 0);

  if (data && (data as TgUser).income > 0) {
    const u = { ...EMPTY((data as TgUser).tg_id), ...(data as Partial<TgUser>) };
    return {
      tgId: u.tg_id,
      income: u.income,
      mandatory: u.mandatory,
      savings: u.savings,
      goalName: u.goal_name,
      goalTarget: u.goal_target,
      goalSaved: u.goal_saved,
      currentBalance: u.current_balance,
      minBalance: u.min_balance,
      payday: u.payday,
      categories,
      purchasePrice,
    };
  }
  // нет привязки/бюджета в боте — берём из последнего сохранённого расчёта
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
    currentBalance: Math.round(b?.currentBalance ?? 0),
    minBalance: Math.round(b?.minimumBalance ?? 0),
    payday: Math.round(b?.payday ?? 0),
    categories,
    purchasePrice,
  };
}

/** Полная сводка периода для аккаунта (используют /account, калькулятор, API). */
export async function getMonthSummaryByUser(userId: string): Promise<MonthSummary> {
  const b = await accountBudget(userId);
  const free = freeFromBudget(b.income, b.mandatory, b.savings);
  const period = periodOf(b.payday);
  const { expense, income } = await ledgerTotals({ userId }, period.fromDay);
  const spentToday = await dayExpense({ userId }, mskToday());
  const base = period.cycleMode ? Math.max(0, b.currentBalance - b.minBalance) : free;
  const remaining = base - expense + income;
  // распределение доступного по категориям (на что можно тратить)
  const alloc = allocateCategories(Math.max(0, base), b.categories);
  const categories = alloc.allocations.map((a) => ({
    label: a.label,
    amount: a.amount,
    percent: a.percent,
  }));
  // планируемая покупка: недостача от наличных + срок по реальной сумме откладывания
  const cashNow = Math.max(0, b.currentBalance - b.minBalance);
  const purchaseGap = Math.max(0, b.purchasePrice - cashNow);
  const purchase =
    b.purchasePrice > 0
      ? {
          price: b.purchasePrice,
          gap: purchaseGap,
          months: purchaseGap > 0 && b.savings > 0 ? Math.ceil(purchaseGap / b.savings) : null,
        }
      : null;
  return {
    hasBudget: b.income > 0,
    linked: b.tgId != null,
    income: b.income,
    free,
    spentMonth: expense,
    spentToday,
    extraIncome: income,
    remaining,
    perDay: dailyAllowance(period.cycleMode, free, remaining, period.daysLeft),
    daysLeft: period.daysLeft,
    goalName: b.goalName,
    goalRemaining: Math.max(0, b.goalTarget - b.goalSaved),
    cycleMode: period.cycleMode,
    nextPayday: period.nextPayday,
    base,
    categories,
    purchase,
  };
}

export type TemplateItem = { id: string; label: string | null; free: number | null; active: boolean };

/** Шаблоны аккаунта (стабильный порядок). active = явно выбранный (или последний, если не выбран). */
export async function listAccountTemplates(userId: string): Promise<TemplateItem[]> {
  const supabase = createAdminClient();
  const [{ data }, activeId] = await Promise.all([
    supabase
      .from("calculations")
      .select("id,label,free")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    activeCalcId(userId),
  ]);
  const rows = (data ?? []) as { id: string; label: string | null; free: number | null }[];
  const effectiveActive = activeId && rows.some((r) => r.id === activeId) ? activeId : rows[0]?.id;
  return rows.map((r) => ({ ...r, active: r.id === effectiveActive }));
}

/** Сделать шаблон активным: явно сохраняем выбор (порядок списка не меняется). */
export async function activateTemplate(userId: string, id: string): Promise<MonthSummary> {
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("calculations")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) throw new Error("Шаблон не найден");
  const { error } = await supabase
    .from("account_settings")
    .upsert({ user_id: userId, active_calc_id: id }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  await pushBudgetToBot(userId).catch(() => {}); // синхрон с ботом, если привязан
  return getMonthSummaryByUser(userId);
}

/** Удалить шаблон (расчёт) аккаунта. */
export async function deleteTemplate(userId: string, id: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("calculations").delete().eq("id", id).eq("user_id", userId);
}

/** Переименовать шаблон. */
export async function renameTemplate(userId: string, id: string, label: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("calculations")
    .update({ label: label.trim().slice(0, 40) || "Расчёт" })
    .eq("id", id)
    .eq("user_id", userId);
}

/** Записи леджера аккаунта за текущий период (новые сверху). */
export async function getMonthEntries(userId: string): Promise<LedgerEntry[]> {
  const b = await accountBudget(userId);
  const period = periodOf(b.payday);
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tg_expenses")
    .select("id,kind,amount,note,day,source")
    .eq("user_id", userId)
    .gte("day", period.fromDay)
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
    const horizon = summary.cycleMode ? "до зарплаты" : "на месяц";
    const tail =
      summary.remaining < 0
        ? `🔴 Перерасход ${fmt(-summary.remaining)}.`
        : `Осталось ${horizon}: <b>${fmt(summary.remaining)}</b> ≈ ${fmt(summary.perDay)}/день.`;
    await tgSend(b.tgId, `${head}\n${tail}`, { keyboard: KB.keyboard });
  }

  // Сразу шлём push на телефон: сколько ещё можно потратить
  const horizon = summary.cycleMode ? "до зарплаты" : "на месяц";
  const pushBody =
    summary.remaining < 0
      ? `Перерасход ${fmt(-summary.remaining)}. Сегодня лучше не тратить.`
      : `Записал ${kind === "income" ? "доход +" : "трату "}${fmt(Math.abs(amount))}. Осталось ${horizon}: ${fmt(summary.remaining)} ≈ ${fmt(summary.perDay)}/день.`;
  await sendPushToUser(userId, { title: "Деньги под контролем", body: pushBody, url: "/account", tag: "ledger" }).catch(
    () => {},
  );

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
    // напоминания — только оплатившим
    if (!(await hasPaidAccessForUser(u.user_id))) continue;
    const s = await computeStatus(u);
    const dl = s.period.daysLeft;
    const perDay = s.perDay;
    const yest = await dayExpense(keyOf(u), mskYesterday());
    const horizon = s.period.cycleMode
      ? `до зарплаты ${s.period.nextPayday ? fmtDate(s.period.nextPayday) : ""}`
      : "на месяц";

    const lines = [
      `☀️ <b>Доброе утро!</b>`,
      yest > 0 ? `Вчера потратил: ${fmt(yest)}` : `Вчера трат не записал.`,
      s.remaining < 0
        ? `🔴 Перерасход ${fmt(-s.remaining)}.`
        : `Осталось ${horizon}: <b>${fmt(s.remaining)}</b> ≈ ${fmt(perDay)}/день (${dl} ${pluralDays(dl)}).`,
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

/**
 * Утренние web-push напоминания (МСК 9–11, раз в день на пользователя).
 * Шлём оплатившим, у кого включены пуши в приложении.
 */
export async function sendPushReminders(force = false): Promise<{ sent: number; skipped: string }> {
  if (!isPushConfigured()) return { sent: 0, skipped: "push не настроен (нет VAPID)" };
  const hour = mskHour();
  if (!force && (hour < 9 || hour > 11)) {
    return { sent: 0, skipped: `не время (МСК ${hour}:00)` };
  }
  const supabase = createAdminClient();
  const today = mskToday();
  const { data } = await supabase
    .from("push_subscriptions")
    .select("user_id,last_push_on");
  // уникальные пользователи, кому сегодня ещё не слали
  const userIds = Array.from(
    new Set(
      ((data ?? []) as { user_id: string; last_push_on: string | null }[])
        .filter((r) => force || r.last_push_on !== today)
        .map((r) => r.user_id),
    ),
  );

  let sent = 0;
  for (const userId of userIds) {
    if (!(await hasPaidAccessForUser(userId))) continue;
    const s = await getMonthSummaryByUser(userId);
    if (!s.hasBudget) continue;
    const horizon = s.cycleMode
      ? `до зарплаты ${s.nextPayday ? fmtDate(s.nextPayday) : ""}`
      : "на месяц";
    const body =
      s.remaining < 0
        ? `Перерасход ${fmt(-s.remaining)}. Сегодня лучше не тратить.`
        : `Осталось ${horizon}: ${fmt(s.remaining)} ≈ ${fmt(s.perDay)}/день. Запиши траты за сегодня.`;
    const n = await sendPushToUser(userId, { title: "Деньги под контролем", body, url: "/app", tag: "daily" });
    if (n > 0) {
      sent += n;
      await supabase.from("push_subscriptions").update({ last_push_on: today }).eq("user_id", userId);
    }
  }
  return { sent, skipped: "" };
}
