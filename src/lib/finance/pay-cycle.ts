/**
 * Учёт даты зарплаты (cash-flow по циклам).
 *
 * Проблема: «сколько можно тратить в день» нельзя считать как monthlyFree/30,
 * если зарплата ещё не пришла, а на счету — конкретный остаток. Правильно считать
 * по ЦИКЛУ до зарплаты: сколько денег есть сейчас и сколько дней до следующего дохода.
 *
 * Цикл = [последняя зарплата (вкл.) … следующая зарплата (искл.)].
 * Все даты — в МСК (передаём ref с уже сдвинутыми UTC-полями).
 */

/** 31-е число в коротком месяце → последний день месяца. */
export function clampDay(day: number, year: number, monthIndex: number): number {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.min(Math.max(1, Math.round(day)), lastDay);
}

function atDay(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, clampDay(day, year, monthIndex)));
}

/** Ближайшая будущая зарплата (если сегодня день зарплаты — она считается уже наступившей → берём следующий месяц). */
export function nextPayday(payday: number, ref: Date): Date {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const d = ref.getUTCDate();
  if (d < clampDay(payday, y, m)) return atDay(y, m, payday);
  return atDay(y, m + 1, payday);
}

/** Последняя наступившая зарплата (включая сегодня). */
export function lastPayday(payday: number, ref: Date): Date {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const d = ref.getUTCDate();
  if (d >= clampDay(payday, y, m)) return atDay(y, m, payday);
  return atDay(y, m - 1, payday);
}

const MS_DAY = 86_400_000;
function midnightUTC(ref: Date): number {
  return Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());
}

export interface CycleBounds {
  /** Начало цикла (последняя зарплата), YYYY-MM-DD */
  start: string;
  /** Следующая зарплата, YYYY-MM-DD */
  end: string;
  /** Дней до следующей зарплаты, включая сегодня (>= 1) */
  daysLeft: number;
  /** Всего дней в цикле */
  totalDays: number;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Границы текущего цикла зарплаты относительно ref (МСК). payday=1..31. */
export function cycleBounds(payday: number, ref: Date): CycleBounds {
  const start = lastPayday(payday, ref);
  const end = nextPayday(payday, ref);
  const daysLeft = Math.max(1, Math.round((end.getTime() - midnightUTC(ref)) / MS_DAY));
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_DAY));
  return { start: iso(start), end: iso(end), daysLeft, totalDays };
}

/** Валиден ли день зарплаты (1..31). 0/undefined → выключено (считаем по календарному месяцу). */
export function hasPayday(payday: number | null | undefined): payday is number {
  return typeof payday === "number" && payday >= 1 && payday <= 31;
}
