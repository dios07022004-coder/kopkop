/**
 * @deprecated Use @/lib/finance instead. Thin compatibility layer.
 */
export {
  allocateCategories,
  computeBudgetCore,
  computeFinance,
  DEFAULT_BUDGET_INPUT,
  DEFAULT_CATEGORIES,
  DEFAULT_MANDATORY_LINES,
  DEFAULT_PURCHASE_INPUT,
  decidePurchase,
  normalizeBudgetInput,
  normalizePurchaseInput,
  buildBreakdown,
} from "@/lib/finance";

export type {
  BudgetInput,
  BudgetCore,
  FinanceResult,
  PurchaseDecision,
  CategoryAllocation,
  MandatoryExpenseLine,
} from "@/lib/finance";

export type { MandatoryExpenseLine as MandatoryExpense } from "@/lib/finance";
export { DEFAULT_MANDATORY_LINES as DEFAULT_MANDATORY } from "@/lib/finance";

import { computeFinance, DEFAULT_BUDGET_INPUT } from "@/lib/finance";
import type { BudgetSplitterInput, BudgetSplitterResult } from "./budget-splitter-types";

export function calculateBudgetSplit(input: BudgetSplitterInput): BudgetSplitterResult {
  const mandatoryMonthly =
    input.mandatoryExpenses.reduce((s, e) => s + e.amount, 0) ||
    input.mandatoryMonthly ||
    0;

  const result = computeFinance({
    incomeMonthly: input.monthlyIncome,
    currentBalance: input.currentBalance,
    mandatoryMonthly,
    mandatoryExpenses: input.mandatoryExpenses,
    plannedVariableMonthly: input.plannedVariableMonthly ?? 0,
    savingsMonthly: input.savingsGoal,
    minimumBalance: input.targetBalanceOnAccount,
    categories: input.categories,
  });

  const { core, allocation } = result;

  let status: BudgetSplitterResult["status"] = core.safetyStatus;
  let statusLabel = core.safetyStatusLabel;
  let summary = "";

  if (core.availableForLife <= 0 || core.balanceAfterMandatory < input.targetBalanceOnAccount) {
    status = "danger";
    statusLabel = "Денег не хватает";
    summary =
      core.availableForLife <= 0
        ? "После обязательных трат и резерва свободных денег не остаётся."
        : "На счёте не хватит на обязательные платежи с сохранением минимума.";
  } else if (core.availableForLife < 10000 || core.safeToSpendNow < 5000) {
    status = "caution";
    statusLabel = "Тратить осторожно";
    summary = `Можно распределить ${core.availableForLife.toLocaleString("ru-RU")} ₽ на месяц.`;
  } else {
    status = "healthy";
    statusLabel = "Бюджет сходится";
    summary = `На жизнь остаётся ${core.availableForLife.toLocaleString("ru-RU")} ₽ в месяц.`;
  }

  return {
    totalMandatory: mandatoryMonthly,
    balanceAfterMandatory: core.balanceAfterMandatory,
    totalAvailable: core.totalResources,
    freeToSpend: core.availableForLife,
    safeToSpendNow: core.safeToSpendNow,
    projectedEndBalance: core.projectedEndBalance,
    allocations: allocation.allocations,
    status,
    statusLabel,
    summary,
  };
}

export const DEFAULT_SPLITTER_INPUT: BudgetSplitterInput = {
  currentBalance: DEFAULT_BUDGET_INPUT.currentBalance,
  monthlyIncome: DEFAULT_BUDGET_INPUT.incomeMonthly,
  mandatoryMonthly: DEFAULT_BUDGET_INPUT.mandatoryMonthly,
  mandatoryExpenses: DEFAULT_BUDGET_INPUT.mandatoryExpenses ?? [],
  plannedVariableMonthly: DEFAULT_BUDGET_INPUT.plannedVariableMonthly,
  savingsGoal: DEFAULT_BUDGET_INPUT.savingsMonthly,
  targetBalanceOnAccount: DEFAULT_BUDGET_INPUT.minimumBalance,
  categories: DEFAULT_BUDGET_INPUT.categories ?? [],
};
