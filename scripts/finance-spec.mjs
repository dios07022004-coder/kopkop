/**
 * Shared finance spec for Excel template generation.
 * Keep in sync with src/lib/finance/constants.ts
 */
export const THRESHOLD_CAUTION_AVAILABLE_LIFE = 10000;
export const THRESHOLD_CAUTION_FREE_BUDGET = 5000;

export const DEFAULT_CATEGORIES = [
  { id: "food", label: "Продукты", percent: 35 },
  { id: "transport", label: "Транспорт", percent: 15 },
  { id: "health", label: "Здоровье / аптека", percent: 10 },
  { id: "fun", label: "Развлечения", percent: 10 },
  { id: "other", label: "Прочее", percent: 30 },
];

export const DEFAULT_INPUT = {
  currentBalance: 45000,
  incomeMonthly: 80000,
  rent: 25000,
  credit: 10000,
  utilities: 5000,
  plannedVariable: 15000,
  savings: 10000,
  minimumBalance: 30000,
  purchasePrice: 35000,
};

/** Default savings goal row — sync with DEFAULT_SAVINGS_GOAL_INPUT in constants.ts */
export const DEFAULT_SAVINGS_GOAL = {
  goalName: "Отпуск",
  targetAmount: 120000,
  currentSaved: 0,
  deadlineMonths: 6,
  monthlyContribution: 20000,
};
