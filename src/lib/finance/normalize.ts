import type { BudgetCategory, BudgetInput, PurchaseInput } from "./types";
import { DEFAULT_BUDGET_INPUT, DEFAULT_CATEGORIES } from "./constants";
import { budgetInputSchema, purchaseInputSchema } from "../validations";

function toNonNegativeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function toScore(value: unknown, fallback = 3): number {
  const n = Math.round(toNonNegativeNumber(value, fallback));
  return Math.min(5, Math.max(1, n || fallback));
}

export function sumMandatoryLines(
  lines: BudgetInput["mandatoryExpenses"],
): number {
  if (!lines?.length) return 0;
  return lines.reduce((sum, line) => sum + toNonNegativeNumber(line.amount), 0);
}

export function normalizeBudgetInput(raw: Partial<BudgetInput>): BudgetInput {
  const mandatoryExpenses =
    raw.mandatoryExpenses?.map((line, i) => ({
      id: line.id || `mandatory-${i}`,
      label: line.label || "Обязательное",
      amount: toNonNegativeNumber(line.amount),
    })) ?? DEFAULT_BUDGET_INPUT.mandatoryExpenses;

  const linesSum = sumMandatoryLines(mandatoryExpenses);
  const mandatoryMonthly =
    raw.mandatoryMonthly !== undefined
      ? toNonNegativeNumber(raw.mandatoryMonthly)
      : linesSum > 0
        ? linesSum
        : DEFAULT_BUDGET_INPUT.mandatoryMonthly;

  const categories: BudgetCategory[] =
    raw.categories?.map((cat, i) => ({
      id: cat.id || `cat-${i}`,
      label: cat.label || "Категория",
      percent: toNonNegativeNumber(cat.percent),
    })) ?? DEFAULT_CATEGORIES;

  return {
    incomeMonthly: toNonNegativeNumber(raw.incomeMonthly),
    currentBalance: toNonNegativeNumber(raw.currentBalance),
    mandatoryMonthly,
    mandatoryExpenses,
    plannedVariableMonthly: toNonNegativeNumber(raw.plannedVariableMonthly),
    savingsMonthly: toNonNegativeNumber(raw.savingsMonthly),
    minimumBalance: toNonNegativeNumber(raw.minimumBalance),
    reserveTarget: raw.reserveTarget !== undefined
      ? toNonNegativeNumber(raw.reserveTarget)
      : undefined,
    categories,
    payday:
      raw.payday !== undefined && raw.payday !== null
        ? Math.min(31, Math.max(0, Math.round(toNonNegativeNumber(raw.payday))))
        : undefined,
  };
}

export function parseBudgetInput(raw: Partial<BudgetInput>): BudgetInput {
  const parsed = budgetInputSchema.safeParse(raw);
  return normalizeBudgetInput(parsed.success ? parsed.data : raw);
}

export function parsePurchaseInput(raw: Partial<PurchaseInput>): PurchaseInput {
  const parsed = purchaseInputSchema.safeParse(raw);
  return normalizePurchaseInput(parsed.success ? parsed.data : raw);
}

export function normalizePurchaseInput(raw: Partial<PurchaseInput>): PurchaseInput {
  return {
    price: toNonNegativeNumber(raw.price),
    urgency: toScore(raw.urgency),
    usefulness: toScore(raw.usefulness),
  };
}
