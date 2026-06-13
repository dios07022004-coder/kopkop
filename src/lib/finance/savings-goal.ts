import { getSavingsGoalCopy, getSavingsGoalStatusLabel } from "./savings-copy";
import type {
  BudgetCore,
  BudgetInput,
  SavingsGoalInput,
  SavingsGoalResult,
  SavingsGoalStatus,
} from "./types";

function ceilRub(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value);
}

export interface SavingsGoalContext {
  /** Свободный поток до учёта взноса на цель */
  freeBudgetBeforeGoal: number;
  /** Свободный поток после взноса (если цель связана с бюджетом) */
  freeAfterGoal?: number;
}

export function computeSavingsGoal(
  core: BudgetCore,
  input: BudgetInput,
  goal: SavingsGoalInput,
  context?: SavingsGoalContext,
): SavingsGoalResult {
  const freeBefore =
    context?.freeBudgetBeforeGoal ?? core.freeBudgetMonthly;
  const freeAfter =
    context?.freeAfterGoal ?? context?.freeBudgetBeforeGoal ?? core.freeBudgetMonthly;

  const targetAmount = Math.max(0, goal.targetAmount);
  const currentSaved = Math.max(0, goal.currentSaved);
  const remainingToSave = Math.max(0, targetAmount - currentSaved);

  const progressPercent =
    targetAmount > 0
      ? Math.min(100, Math.round((currentSaved / targetAmount) * 1000) / 10)
      : 0;

  const safeContribution = Math.max(0, freeBefore);

  const deadlineMonths =
    goal.deadlineMonths !== undefined && goal.deadlineMonths > 0
      ? Math.ceil(goal.deadlineMonths)
      : undefined;

  const requiredMonthly =
    remainingToSave > 0 && deadlineMonths
      ? ceilRub(remainingToSave / deadlineMonths)
      : null;

  const monthlyContribution =
    goal.monthlyContribution !== undefined && goal.monthlyContribution > 0
      ? Math.ceil(goal.monthlyContribution)
      : undefined;

  const effectiveContribution =
    monthlyContribution ?? requiredMonthly ?? safeContribution;

  const monthsToGoal =
    remainingToSave > 0 && effectiveContribution > 0
      ? ceilRub(remainingToSave / effectiveContribution)
      : null;

  const contributionFromIncome = effectiveContribution <= freeBefore;
  const drawFromReserve = Math.max(0, effectiveContribution - freeBefore);
  const reserveBelowMinimum = input.currentBalance < input.minimumBalance;
  const aheadOfDeadline =
    deadlineMonths != null &&
    monthsToGoal != null &&
    monthsToGoal <= deadlineMonths;
  const behindDeadline =
    deadlineMonths != null &&
    monthsToGoal != null &&
    monthsToGoal > deadlineMonths;
  const usesAllFreeIncome =
    monthlyContribution != null &&
    monthlyContribution > 0 &&
    freeAfter <= 0 &&
    contributionFromIncome;

  let status: SavingsGoalStatus;

  if (targetAmount > 0 && currentSaved >= targetAmount) {
    status = "achieved";
  } else if (targetAmount <= 0) {
    status = "impossible";
  } else if (freeBefore <= 0) {
    status = "impossible";
  } else if (
    goal.canUseReserve &&
    drawFromReserve > 0 &&
    input.currentBalance - drawFromReserve < input.minimumBalance
  ) {
    status = "risk";
  } else if (!contributionFromIncome) {
    status = "warning";
  } else if (behindDeadline) {
    status = "warning";
  } else if (
    requiredMonthly != null &&
    requiredMonthly > freeBefore
  ) {
    status = "warning";
  } else if (usesAllFreeIncome) {
    status = "warning";
  } else if (
    !contributionFromIncome &&
    reserveBelowMinimum
  ) {
    status = "risk";
  } else {
    status = "ok";
  }

  const copy = getSavingsGoalCopy(status, {
    goalName: goal.goalName || "Цель",
    remainingToSave,
    requiredMonthly,
    monthsToGoal,
    effectiveContribution,
    freeBudgetBeforeGoal: freeBefore,
    freeAfterGoal: freeAfter,
    deadlineMonths,
    aheadOfDeadline,
    behindDeadline,
    usesAllFreeIncome,
    reserveBelowMinimum,
    contributionFromIncome,
    drawFromReserve,
  });

  return {
    remainingToSave,
    requiredMonthly,
    monthsToGoal,
    progressPercent,
    safeContribution,
    effectiveContribution,
    freeAfterGoal: monthlyContribution != null ? freeAfter : null,
    status,
    statusLabel: getSavingsGoalStatusLabel(status, {
      aheadOfDeadline,
      behindDeadline,
      usesAllFreeIncome,
    }),
    summary: copy.summary,
    explanation: copy.explanation,
    nextStep: copy.nextStep,
    insights: copy.insights,
    reserveNote: copy.reserveNote,
  };
}

export function normalizeSavingsGoalInput(
  raw: Partial<SavingsGoalInput>,
): SavingsGoalInput {
  const priority =
    raw.priority === "low" || raw.priority === "high" ? raw.priority : "medium";

  return {
    goalName: raw.goalName?.trim() || "Моя цель",
    targetAmount: Math.max(0, Number(raw.targetAmount) || 0),
    currentSaved: Math.max(0, Number(raw.currentSaved) || 0),
    deadlineMonths:
      raw.deadlineMonths !== undefined && raw.deadlineMonths > 0
        ? Math.ceil(Number(raw.deadlineMonths))
        : undefined,
    monthlyContribution:
      raw.monthlyContribution !== undefined && raw.monthlyContribution > 0
        ? Math.ceil(Number(raw.monthlyContribution))
        : undefined,
    priority,
    canUseReserve: Boolean(raw.canUseReserve),
  };
}
