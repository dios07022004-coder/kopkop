import type { BudgetCategory, BudgetInput } from "./types";

export const THRESHOLD_CAUTION_FREE_BUDGET = 5000;
export const THRESHOLD_CAUTION_AVAILABLE_LIFE = 10000;
export const THRESHOLD_CAUTION_SAFE_SPEND = 5000;
export const THRESHOLD_RESERVE_HEALTHY = 80;
export const THRESHOLD_RESERVE_CAUTION = 50;

export const URGENCY_WAIT_MAX = 2;
export const USEFULNESS_WAIT_MAX = 2;

export const REMAINDER_CATEGORY_ID = "other";

export const DEFAULT_CATEGORIES: BudgetCategory[] = [
  { id: "food", label: "Продукты", percent: 35 },
  { id: "transport", label: "Транспорт", percent: 15 },
  { id: "health", label: "Здоровье / аптека", percent: 10 },
  { id: "fun", label: "Развлечения", percent: 10 },
  { id: REMAINDER_CATEGORY_ID, label: "Прочее", percent: 30 },
];

export const DEFAULT_MANDATORY_LINES = [
  { id: "rent", label: "Аренда / ипотека", amount: 25000 },
  { id: "credit", label: "Кредиты", amount: 10000 },
  { id: "utilities", label: "Коммуналка", amount: 5000 },
];

export const DEFAULT_BUDGET_INPUT: BudgetInput = {
  incomeMonthly: 80000,
  currentBalance: 45000,
  mandatoryMonthly: 40000,
  mandatoryExpenses: DEFAULT_MANDATORY_LINES,
  plannedVariableMonthly: 15000,
  savingsMonthly: 10000,
  minimumBalance: 30000,
  categories: DEFAULT_CATEGORIES,
};

export const DEFAULT_PURCHASE_INPUT = {
  price: 35000,
  urgency: 3,
  usefulness: 4,
};

export const DEFAULT_SAVINGS_GOAL_INPUT = {
  goalName: "Ноутбук",
  targetAmount: 60000,
  currentSaved: 15000,
  deadlineMonths: 4,
  monthlyContribution: undefined as number | undefined,
  priority: "medium" as const,
  canUseReserve: false,
};

/** Shared spec for Excel template generation (imported from scripts via JSON export) */
export const EXCEL_SPEC = {
  thresholds: {
    cautionLife: THRESHOLD_CAUTION_AVAILABLE_LIFE,
    cautionFreeBudget: THRESHOLD_CAUTION_FREE_BUDGET,
  },
  categories: DEFAULT_CATEGORIES,
  defaultInput: DEFAULT_BUDGET_INPUT,
  defaultPurchase: DEFAULT_PURCHASE_INPUT,
} as const;
