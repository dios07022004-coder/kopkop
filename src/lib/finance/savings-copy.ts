import type { SavingsGoalStatus } from "./types";
import { formatRub } from "@/lib/utils";

function formatMonthsText(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} месяцев`;
  if (mod10 === 1) return `${count} месяц`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} месяца`;
  return `${count} месяцев`;
}

const STATUS_LABELS: Record<SavingsGoalStatus, string> = {
  ok: "План сходится",
  warning: "Нужно внимание",
  risk: "Сейчас рискованно",
  impossible: "Пока не получится",
  achieved: "Цель достигнута",
};

export function getSavingsGoalStatusLabel(
  status: SavingsGoalStatus,
  flags?: {
    aheadOfDeadline?: boolean;
    behindDeadline?: boolean;
    usesAllFreeIncome?: boolean;
  },
): string {
  if (status === "warning" && flags?.behindDeadline) {
    return "Срок слишком короткий";
  }
  if (status === "ok" && flags?.aheadOfDeadline) {
    return "Успеваете к сроку";
  }
  if (status === "warning" && flags?.usesAllFreeIncome && flags?.aheadOfDeadline) {
    return "Успеваете, но впритык";
  }
  return STATUS_LABELS[status];
}

export function getSavingsGoalCopy(
  status: SavingsGoalStatus,
  params: {
    goalName: string;
    remainingToSave: number;
    requiredMonthly: number | null;
    monthsToGoal: number | null;
    effectiveContribution: number;
    freeBudgetBeforeGoal: number;
    freeAfterGoal: number;
    deadlineMonths?: number;
    aheadOfDeadline?: boolean;
    behindDeadline?: boolean;
    usesAllFreeIncome?: boolean;
    reserveBelowMinimum?: boolean;
    contributionFromIncome?: boolean;
    drawFromReserve?: number;
  },
): {
  summary: string;
  explanation: string;
  nextStep: string;
  insights: string[];
  reserveNote?: string;
} {
  const {
    goalName,
    remainingToSave,
    requiredMonthly,
    monthsToGoal,
    effectiveContribution,
    freeBudgetBeforeGoal,
    freeAfterGoal,
    deadlineMonths,
    aheadOfDeadline,
    behindDeadline,
    usesAllFreeIncome,
    reserveBelowMinimum,
    contributionFromIncome,
    drawFromReserve = 0,
  } = params;

  const insights: string[] = [];

  if (monthsToGoal != null) {
    insights.push(
      `При ${formatRub(effectiveContribution)}/мес накопите за ${formatMonthsText(monthsToGoal)}`,
    );
  }

  if (deadlineMonths != null && requiredMonthly != null) {
    if (aheadOfDeadline) {
      insights.push(
        `Срок ${formatMonthsText(deadlineMonths)} — успеваете (нужно было ${formatRub(requiredMonthly)}/мес)`,
      );
    } else if (behindDeadline) {
      insights.push(
        `Для срока ${formatMonthsText(deadlineMonths)} нужно ${formatRub(requiredMonthly)}/мес`,
      );
    }
  }

  if (usesAllFreeIncome) {
    insights.push(
      `Весь свободный доход (${formatRub(freeBudgetBeforeGoal)}/мес) уйдёт на «${goalName}» — на траты из зарплаты не останется`,
    );
  } else if (freeAfterGoal > 0) {
    insights.push(
      `После отложений останется ${formatRub(freeAfterGoal)}/мес на жизнь из дохода`,
    );
  }

  let reserveNote: string | undefined;
  if (reserveBelowMinimum && contributionFromIncome && drawFromReserve === 0) {
    reserveNote =
      "На счёте меньше минимальной подушки — копить из зарплаты можно, но резерв лучше поднять отдельно.";
  } else if (reserveBelowMinimum && drawFromReserve > 0) {
    reserveNote =
      "На счёте мало — брать на цель с карты сейчас небезопасно.";
  }

  switch (status) {
    case "achieved":
      return {
        summary: `На «${goalName}» уже достаточно денег.`,
        explanation: "Можно покупать или переключиться на другую цель.",
        nextStep: "Зафиксируйте сумму в отдельной копилке или спланируйте покупку.",
        insights: ["Цель закрыта по сумме"],
        reserveNote,
      };
    case "ok":
      return {
        summary:
          monthsToGoal != null
            ? `Копите ${formatRub(effectiveContribution)}/мес → «${goalName}» через ${formatMonthsText(monthsToGoal)}`
            : `Откладывайте ${formatRub(effectiveContribution)}/мес на «${goalName}»`,
        explanation: aheadOfDeadline
          ? `План укладывается в срок и в ваш доход (${formatRub(freeBudgetBeforeGoal)}/мес свободно).`
          : `Взнос ${formatRub(effectiveContribution)}/мес помещается в свободный бюджет ${formatRub(freeBudgetBeforeGoal)}.`,
        nextStep: "Держите взнос стабильным каждый месяц.",
        insights,
        reserveNote,
      };
    case "warning":
      if (usesAllFreeIncome && aheadOfDeadline) {
        return {
          summary:
            monthsToGoal != null
              ? `«${goalName}» через ${formatMonthsText(monthsToGoal)} — срок соблюдён, но без денег на жизнь из зарплаты`
              : `Весь свободный доход уходит на «${goalName}»`,
          explanation:
            "Математика сходится: вы успеваете к дедлайну. Но после отложений из дохода на повседневное не остаётся — заложите это в план.",
          nextStep:
            freeAfterGoal <= 0
              ? "Либо снизьте взнос и увеличьте срок, либо учитывайте, что жить придётся со счёта или из уже накопленного."
              : "Следите, чтобы хватало на обязательные траты.",
          insights,
          reserveNote,
        };
      }
      if (behindDeadline && requiredMonthly != null) {
        return {
          summary: `Не успеваете к сроку: нужно ${formatRub(requiredMonthly)}/мес, а откладываете ${formatRub(effectiveContribution)}`,
          explanation:
            monthsToGoal != null && deadlineMonths != null
              ? `При текущем взносе — ${formatMonthsText(monthsToGoal)}, а вы хотели ${formatMonthsText(deadlineMonths)}.`
              : "Увеличьте взнос или срок.",
          nextStep: `Поднимите взнос до ${formatRub(requiredMonthly)}/мес или срок до ${monthsToGoal != null ? formatMonthsText(monthsToGoal) : "больше"}.`,
          insights,
          reserveNote,
        };
      }
      return {
        summary: `Взнос ${formatRub(effectiveContribution)}/мес выше свободного бюджета ${formatRub(freeBudgetBeforeGoal)}`,
        explanation: "Из зарплаты столько не выделить — придётся резать траты или брать с счёта.",
        nextStep: "Уменьшите взнос, увеличьте доход или срок накопления.",
        insights,
        reserveNote,
      };
    case "risk":
      return {
        summary: "Копить так сейчас опасно для резерва",
        explanation:
          drawFromReserve > 0
            ? `Не хватает ${formatRub(drawFromReserve)}/мес из дохода — придётся тронуть счёт, и подушка упадёт ниже минимума.`
            : `Осталось ${formatRub(remainingToSave)}, но бюджет или счёт не выдерживают такую нагрузку.`,
        nextStep: "Сначала поднимите резерв на счёте или снизьте взнос.",
        insights,
        reserveNote,
      };
    case "impossible":
      return {
        summary: "Сейчас откладывать не из чего",
        explanation:
          "После обязательных платежей свободного дохода нет — сначала закройте «дыры» в бюджете.",
        nextStep: "Вернитесь к цели, когда появится положительный поток из зарплаты.",
        insights: [`Свободно из дохода: ${formatRub(freeBudgetBeforeGoal)}/мес`],
        reserveNote,
      };
  }
}

export { formatMonthsText };
