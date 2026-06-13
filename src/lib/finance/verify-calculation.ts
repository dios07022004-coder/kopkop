import { formatRub } from "@/lib/utils";
import type { BudgetCore, BudgetInput, FinanceResult } from "./types";

export interface WhyChainStep {
  label: string;
  amount: string;
  sign: "+" | "−" | "=";
}

export interface VerifyFormulaBlock {
  id: "salary" | "month" | "card";
  title: string;
  question: string;
  formula: string;
  explain: string;
  note?: string;
}

export interface VerifyCalculationView {
  chainIntro: string;
  chainSteps: WhyChainStep[];
  chainCheck: string;
  chainNote: string;
  formulasIntro: string;
  formulas: VerifyFormulaBlock[];
  threeNumbersNote: string;
}

export function buildWhyChainSteps(
  budget: BudgetInput,
  result: FinanceResult,
): WhyChainStep[] {
  const { core } = result;
  const savings = result.goalContributionApplied ?? budget.savingsMonthly;
  const steps: WhyChainStep[] = [];

  if (budget.currentBalance > 0) {
    steps.push({
      label: "На счёте сейчас",
      amount: formatRub(budget.currentBalance),
      sign: "+",
    });
  }
  if (budget.incomeMonthly > 0) {
    steps.push({
      label: "Доход за месяц",
      amount: formatRub(budget.incomeMonthly),
      sign: "+",
    });
  }
  if (budget.mandatoryMonthly > 0) {
    steps.push({
      label: "Обязательное",
      amount: formatRub(budget.mandatoryMonthly),
      sign: "−",
    });
  }
  if (savings > 0) {
    steps.push({
      label: "Отложения",
      amount: formatRub(savings),
      sign: "−",
    });
  }
  if (budget.plannedVariableMonthly > 0) {
    steps.push({
      label: "Плановые траты",
      amount: formatRub(budget.plannedVariableMonthly),
      sign: "−",
    });
  }
  steps.push({
    label: "Подушка (не трогаем)",
    amount: formatRub(budget.minimumBalance),
    sign: "−",
  });
  steps.push({
    label: "На жизнь в месяце",
    amount: formatRub(core.availableForLife),
    sign: "=",
  });

  return steps;
}

function buildChainCheck(steps: WhyChainStep[], total: number): string {
  const parts: string[] = [];
  for (const step of steps) {
    if (step.sign === "=") continue;
    const num = step.amount.replace(/[^\d]/g, "");
    if (!num) continue;
    parts.push(step.sign === "+" ? `+ ${step.amount}` : `− ${step.amount}`);
  }
  if (parts.length === 0) return "";
  return `${parts.join(" ")} = ${formatRub(total)}`;
}

export function buildVerifyCalculationView(
  budget: BudgetInput,
  result: FinanceResult,
): VerifyCalculationView {
  const { core } = result;
  const savings = result.goalContributionApplied ?? budget.savingsMonthly;
  const steps = buildWhyChainSteps(budget, result);

  const fromSalary = Math.max(0, core.freeBudgetMonthly);
  const fromBalance = Math.max(0, core.availableForLife - fromSalary);
  const rawCard =
    budget.currentBalance -
    budget.minimumBalance -
    core.upcomingMandatoryFromBalance;

  const salaryParts = [
    formatRub(budget.incomeMonthly),
    formatRub(budget.mandatoryMonthly),
  ];
  if (savings > 0) salaryParts.push(formatRub(savings));
  if (budget.plannedVariableMonthly > 0) {
    salaryParts.push(formatRub(budget.plannedVariableMonthly));
  }

  const monthAdds = [
    budget.currentBalance > 0 ? formatRub(budget.currentBalance) : null,
    formatRub(budget.incomeMonthly),
  ]
    .filter(Boolean)
    .join(" + ");

  const monthSubs = [
    formatRub(budget.mandatoryMonthly),
    savings > 0 ? formatRub(savings) : null,
    budget.plannedVariableMonthly > 0
      ? formatRub(budget.plannedVariableMonthly)
      : null,
    formatRub(budget.minimumBalance),
  ]
    .filter(Boolean)
    .join(" − ");

  const formulas: VerifyFormulaBlock[] = [
    {
      id: "salary",
      title: "1. Из зарплаты каждый месяц",
      question: "Сколько стабильно остаётся из дохода — без учёта денег на счёте?",
      formula: `${salaryParts.join(" − ")} = ${formatRub(core.freeBudgetMonthly)}`,
      explain:
        "Считаем только поток из зарплаты: доход минус обязательное, отложения и плановые траты. Эту сумму можно закладывать в бюджет каждый месяц.",
      note:
        fromBalance > 0
          ? `Это не «${formatRub(core.availableForLife)} на месяц» — там ещё учтено ${formatRub(fromBalance)} со счёта.`
          : undefined,
    },
    {
      id: "month",
      title: "2. Лимит на весь месяц",
      question: "Сколько можно потратить на жизнь в этом месяце с учётом счёта и будущего дохода?",
      formula: `${monthAdds} − ${monthSubs} = ${formatRub(core.availableForLife)}`,
      explain:
        "Складываем то, что уже на счёте, и ожидаемый доход. Вычитаем обязательное, отложения и подушку. Получается общий лимит «на жизнь» до конца месяца.",
      note:
        fromBalance > 0
          ? `Из этой суммы ${formatRub(fromSalary)} — из зарплаты, ${formatRub(fromBalance)} — учтено со счёта. Это не значит, что ${formatRub(fromBalance)} можно взять с карты прямо сейчас.`
          : "Весь лимит идёт из зарплаты — на счёте после подушки ничего не добавляет.",
    },
    {
      id: "card",
      title: "3. С карты прямо сейчас",
      question: "Сколько безопасно потратить с карты в этот момент — без риска для подушки и ближайших платежей?",
      formula: `MAX(0, ${formatRub(budget.currentBalance)} − ${formatRub(budget.minimumBalance)} подушка − ${formatRub(core.upcomingMandatoryFromBalance)} обязательное) = ${formatRub(core.availableForPurchaseNow)}`,
      explain: buildCardFormulaExplain(budget, core, rawCard),
      note:
        core.availableForPurchaseNow < fromBalance && fromBalance > 0
          ? `Поэтому «${formatRub(core.availableForLife)} на месяц» и «${formatRub(core.availableForPurchaseNow)} с карты сейчас» — разные цифры.`
          : undefined,
    },
  ];

  return {
    chainIntro:
      "Сложите всё, что приходит, и вычтите то, что нельзя трогать. Так получается «на жизнь в месяце» на главном экране.",
    chainSteps: steps,
    chainCheck: buildChainCheck(steps, core.availableForLife),
    chainNote:
      "Цепочка показывает именно лимит на месяц. Отдельно ниже — формула «с карты сейчас», она строже.",
    formulasIntro:
      "Три разных ответа — три разных вопроса. Цифры могут отличаться, это нормально.",
    formulas,
    threeNumbersNote: buildThreeNumbersNote(core, fromSalary, fromBalance),
  };
}

function buildCardFormulaExplain(
  budget: BudgetInput,
  core: BudgetCore,
  rawCard: number,
): string {
  const lines = [
    `На счёте ${formatRub(budget.currentBalance)}.`,
    `Подушку ${formatRub(budget.minimumBalance)} не трогаем.`,
  ];
  if (core.upcomingMandatoryFromBalance > 0) {
    lines.push(
      `Ближайшее обязательное ${formatRub(core.upcomingMandatoryFromBalance)} «бронируем» с баланса.`,
    );
  }
  if (rawCard < 0) {
    lines.push(
      `По арифметике ${formatRub(rawCard)} — уходит в минус, поэтому берём MAX(0, …) = ${formatRub(0)}.`,
    );
  } else {
    lines.push(`Остаётся ${formatRub(core.availableForPurchaseNow)} — можно тратить сейчас.`);
  }
  return lines.join(" ");
}

function buildThreeNumbersNote(
  core: BudgetCore,
  fromSalary: number,
  fromBalance: number,
): string {
  const parts = [
    `${formatRub(fromSalary)}/мес — стабильно из зарплаты каждый месяц`,
    `${formatRub(core.availableForLife)} — лимит на весь месяц (доход + счёт)`,
    `${formatRub(core.availableForPurchaseNow)} — безопасно с карты прямо сейчас`,
  ];
  if (fromBalance > 0 && core.availableForPurchaseNow === 0) {
    return `${parts.join(". ")}. ${formatRub(fromBalance)} со счёта учтены в месячном лимите, но сейчас их нельзя тратить — их «съедает» обязательное и подушка.`;
  }
  return parts.join(". ") + ".";
}

/** @deprecated use buildVerifyCalculationView formulas */
export function buildHowCalculatedLines(
  budget: BudgetInput,
  result: FinanceResult,
): string[] {
  return buildVerifyCalculationView(budget, result).formulas.map(
    (f) => `${f.title}: ${f.formula}`,
  );
}

export function buildCardSpendBreakdown(
  budget: BudgetInput,
  core: BudgetCore,
): string {
  return `${formatRub(budget.currentBalance)} на счёте − ${formatRub(budget.minimumBalance)} подушка − ${formatRub(core.upcomingMandatoryFromBalance)} ближайшее обязательное = ${formatRub(core.availableForPurchaseNow)}`;
}

const STEP_HINTS: Record<string, string> = {
  "На счёте сейчас": "Деньги, которые уже лежат на карте или счёте",
  "Доход за месяц": "Зарплата и подработки — ожидаете до конца месяца",
  Обязательное: "Аренда, кредиты, коммуналка — нужно заплатить",
  Отложения: "То, что откладываете каждый месяц",
  "Плановые траты": "Еда и быт — уже заложено в бюджет",
  "Подушка (не трогаем)": "Минимум на счёте — ниже не опускаемся",
  "На жизнь в месяце": "Итог: сколько можно потратить на жизнь в этом месяце",
};

export function getWhyChainStepHint(label: string): string | undefined {
  return STEP_HINTS[label];
}
