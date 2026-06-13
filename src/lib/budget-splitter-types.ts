import type { BudgetCategory, MandatoryExpenseLine } from "@/lib/finance";

export interface BudgetSplitterInput {
  currentBalance: number;
  monthlyIncome: number;
  mandatoryMonthly?: number;
  mandatoryExpenses: MandatoryExpenseLine[];
  plannedVariableMonthly?: number;
  savingsGoal: number;
  targetBalanceOnAccount: number;
  categories: BudgetCategory[];
}

export interface BudgetSplitterResult {
  totalMandatory: number;
  balanceAfterMandatory: number;
  totalAvailable: number;
  freeToSpend: number;
  safeToSpendNow: number;
  projectedEndBalance: number;
  allocations: Array<{
    id: string;
    label: string;
    percent: number;
    amount: number;
  }>;
  status: "healthy" | "caution" | "danger";
  statusLabel: string;
  summary: string;
}
