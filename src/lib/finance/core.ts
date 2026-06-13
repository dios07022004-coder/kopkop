import {
  THRESHOLD_CAUTION_AVAILABLE_LIFE,
  THRESHOLD_CAUTION_FREE_BUDGET,
  THRESHOLD_CAUTION_SAFE_SPEND,
  THRESHOLD_RESERVE_CAUTION,
  THRESHOLD_RESERVE_HEALTHY,
} from "./constants";
import {
  getFlowSafetyLabel,
  getReserveSafetyLabel,
  getSafetyStatusLabel,
} from "./copy";
import type { BudgetCore, BudgetInput, BreakdownStep, SafetyStatus } from "./types";

function worstStatus(a: SafetyStatus, b: SafetyStatus): SafetyStatus {
  const rank = { healthy: 0, caution: 1, danger: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function statusFromFreeBudget(freeBudgetMonthly: number): SafetyStatus {
  if (freeBudgetMonthly < 0) return "danger";
  if (freeBudgetMonthly < THRESHOLD_CAUTION_FREE_BUDGET) return "caution";
  return "healthy";
}

function statusFromReserveProgress(reserveProgress: number): SafetyStatus {
  if (reserveProgress < THRESHOLD_RESERVE_CAUTION) return "danger";
  if (reserveProgress < THRESHOLD_RESERVE_HEALTHY) return "caution";
  return "healthy";
}

function statusFromReserveSnapshot(
  currentBalance: number,
  minimumBalance: number,
  balanceAfterMandatory: number,
  reserveProgress: number,
): SafetyStatus {
  let status = statusFromReserveProgress(reserveProgress);
  if (currentBalance < minimumBalance) {
    status = worstStatus(status, "danger");
  } else if (minimumBalance > 0 && balanceAfterMandatory < minimumBalance) {
    status = worstStatus(status, "caution");
  }
  return status;
}

function statusFromAvailableLife(availableForLife: number): SafetyStatus {
  if (availableForLife <= 0) return "danger";
  if (availableForLife < THRESHOLD_CAUTION_AVAILABLE_LIFE) return "caution";
  return "healthy";
}

/** Progress vs minimumBalance unless explicit reserveTarget is set */
export function computeReserveProgress(
  currentBalance: number,
  minimumBalance: number,
  reserveTarget?: number,
): number {
  const explicitTarget =
    reserveTarget !== undefined && reserveTarget > 0 ? reserveTarget : 0;
  const base = explicitTarget > 0 ? explicitTarget : minimumBalance;
  if (base <= 0) return 100;
  return Math.min(100, (currentBalance / base) * 100);
}

export function computeSafetyStatus(
  core: Pick<
    BudgetCore,
    "freeBudgetMonthly" | "reserveProgress" | "availableForLife"
  >,
): SafetyStatus {
  let status: SafetyStatus = "healthy";
  status = worstStatus(status, statusFromFreeBudget(core.freeBudgetMonthly));
  status = worstStatus(status, statusFromReserveProgress(core.reserveProgress));
  status = worstStatus(status, statusFromAvailableLife(core.availableForLife));
  return status;
}

export function computeBudgetCore(input: BudgetInput): BudgetCore {
  const remainingAfterMandatory =
    input.incomeMonthly - input.mandatoryMonthly;

  const freeBudgetMonthly =
    remainingAfterMandatory -
    input.plannedVariableMonthly -
    input.savingsMonthly;

  const totalResources = input.currentBalance + input.incomeMonthly;

  const availableForLife = Math.max(
    0,
    totalResources -
      input.mandatoryMonthly -
      input.savingsMonthly -
      input.minimumBalance,
  );

  const upcomingMandatoryFromBalance = Math.min(
    input.currentBalance,
    input.mandatoryMonthly,
  );

  const availableForPurchaseNow = Math.max(
    0,
    input.currentBalance -
      input.minimumBalance -
      upcomingMandatoryFromBalance,
  );

  const safeToSpendNow = Math.max(
    0,
    input.currentBalance -
      input.minimumBalance -
      upcomingMandatoryFromBalance,
  );

  const balanceAfterMandatory =
    input.currentBalance - upcomingMandatoryFromBalance;

  const projectedEndBalance =
    totalResources -
    input.mandatoryMonthly -
    input.savingsMonthly -
    availableForLife;

  const reserveProgress = computeReserveProgress(
    input.currentBalance,
    input.minimumBalance,
    input.reserveTarget,
  );

  const flowSafetyStatus = statusFromFreeBudget(freeBudgetMonthly);
  const reserveSafetyStatus = statusFromReserveSnapshot(
    input.currentBalance,
    input.minimumBalance,
    balanceAfterMandatory,
    reserveProgress,
  );

  const partial = {
    freeBudgetMonthly,
    reserveProgress,
    availableForLife,
  };

  const safetyStatus = computeSafetyStatus(partial);

  return {
    remainingAfterMandatory,
    freeBudgetMonthly,
    totalResources,
    availableForLife,
    upcomingMandatoryFromBalance,
    availableForPurchaseNow,
    safeToSpendNow,
    balanceAfterMandatory,
    projectedEndBalance,
    reserveProgress,
    flowSafetyStatus,
    reserveSafetyStatus,
    safetyStatus,
    safetyStatusLabel: getSafetyStatusLabel(safetyStatus),
    flowSafetyLabel: getFlowSafetyLabel(flowSafetyStatus),
    reserveSafetyLabel: getReserveSafetyLabel(
      reserveSafetyStatus,
      input.currentBalance,
      input.minimumBalance,
      balanceAfterMandatory,
    ),
  };
}

export function buildBreakdown(
  input: BudgetInput,
  core: BudgetCore,
  effectiveSavingsMonthly?: number,
): BreakdownStep[] {
  const savingsLine = effectiveSavingsMonthly ?? input.savingsMonthly;
  return [
    {
      label: "Доход за месяц",
      value: input.incomeMonthly,
    },
    {
      label: "На счёте сейчас",
      value: input.currentBalance,
    },
    {
      label: "Обязательные траты",
      value: -input.mandatoryMonthly,
      note: "Аренда, кредиты, коммуналка",
    },
    {
      label: "Плановые переменные",
      value: -input.plannedVariableMonthly,
    },
    {
      label: "Копилка / цели",
      value: -savingsLine,
      note:
        effectiveSavingsMonthly != null &&
        effectiveSavingsMonthly > input.savingsMonthly
          ? `Включая взнос на цель с вкладки «Накопить» (${input.savingsMonthly.toLocaleString("ru-RU")} + цель)`
          : undefined,
    },
    {
      label: "Минимум на счёте (резерв)",
      value: -input.minimumBalance,
      note: "Не трогаем — подушка безопасности",
    },
    {
      label: "Свободный поток в месяц",
      value: core.freeBudgetMonthly,
      note: "После всех обязательств и копилки",
    },
    {
      label: "На жизнь в этом месяце",
      value: core.availableForLife,
      note: "Счёт + доход − обязательные − копилка − минимум",
    },
    {
      label: "Доступно на покупку сейчас",
      value: core.availableForPurchaseNow,
      note: "С учётом ближайших обязательных с баланса",
    },
  ];
}

export function isSafeToSpendCaution(
  availableForLife: number,
  safeToSpendNow: number,
): boolean {
  return (
    availableForLife < THRESHOLD_CAUTION_AVAILABLE_LIFE ||
    safeToSpendNow < THRESHOLD_CAUTION_SAFE_SPEND
  );
}
