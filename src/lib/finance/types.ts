export type SafetyStatus = "healthy" | "caution" | "danger";

export type PurchaseDecisionType =
  | "buy_now"
  | "wait"
  | "defer"
  | "build_reserve";

export interface MandatoryExpenseLine {
  id: string;
  label: string;
  amount: number;
}

export interface BudgetCategory {
  id: string;
  label: string;
  percent: number;
}

export interface BudgetInput {
  incomeMonthly: number;
  currentBalance: number;
  mandatoryMonthly: number;
  mandatoryExpenses?: MandatoryExpenseLine[];
  plannedVariableMonthly: number;
  savingsMonthly: number;
  minimumBalance: number;
  reserveTarget?: number;
  categories?: BudgetCategory[];
  /** День зарплаты (1–31). 0/undefined — считаем по календарному месяцу. */
  payday?: number;
}

export interface BudgetCore {
  remainingAfterMandatory: number;
  freeBudgetMonthly: number;
  totalResources: number;
  availableForLife: number;
  upcomingMandatoryFromBalance: number;
  availableForPurchaseNow: number;
  safeToSpendNow: number;
  balanceAfterMandatory: number;
  projectedEndBalance: number;
  reserveProgress: number;
  flowSafetyStatus: SafetyStatus;
  reserveSafetyStatus: SafetyStatus;
  safetyStatus: SafetyStatus;
  safetyStatusLabel: string;
  flowSafetyLabel: string;
  reserveSafetyLabel: string;
}

export interface CategoryAllocation {
  id: string;
  label: string;
  percent: number;
  amount: number;
}

export interface AllocationResult {
  allocations: CategoryAllocation[];
  totalAllocated: number;
}

export interface PurchaseInput {
  price: number;
  urgency: number;
  usefulness: number;
  /** Сколько откладывать в месяц на эту покупку (взнос). */
  monthlyContribution?: number;
}

export interface PurchaseDecision {
  decision: PurchaseDecisionType;
  decisionLabel: string;
  explanation: string;
  nextStep: string;
  missingAmount: number;
  monthsToPurchase: number | null;
  reserveAfterPurchase: number;
  canAffordNow: boolean;
}

export type SavingsGoalStatus =
  | "ok"
  | "warning"
  | "risk"
  | "impossible"
  | "achieved";

export type SavingsGoalPriority = "low" | "medium" | "high";

export interface SavingsGoalInput {
  goalName: string;
  targetAmount: number;
  currentSaved: number;
  deadlineMonths?: number;
  monthlyContribution?: number;
  priority: SavingsGoalPriority;
  canUseReserve: boolean;
}

export interface SavingsGoalResult {
  remainingToSave: number;
  requiredMonthly: number | null;
  monthsToGoal: number | null;
  progressPercent: number;
  safeContribution: number;
  effectiveContribution: number;
  /** Свободно из дохода после отложений на цель */
  freeAfterGoal: number | null;
  status: SavingsGoalStatus;
  statusLabel: string;
  /** Одной строкой — главный ответ */
  summary: string;
  explanation: string;
  nextStep: string;
  /** Короткие подсказки для UI */
  insights: string[];
  /** Отдельно про резерв на счёте (не путать с риском цели) */
  reserveNote?: string;
}

export interface FinanceResult {
  core: BudgetCore;
  allocation: AllocationResult;
  purchase?: PurchaseDecision;
  savingsGoal?: SavingsGoalResult;
  /** Free budget before goal contribution is applied to core */
  freeBudgetBeforeGoal?: number;
  goalContributionApplied?: number;
}

export interface BreakdownStep {
  label: string;
  value: number;
  note?: string;
}
