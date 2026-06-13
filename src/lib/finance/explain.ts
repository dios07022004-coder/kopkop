import type { BudgetCore, BudgetInput, PurchaseDecision } from "./types";
import type { AnswerCardData, ExplainStep, FieldHint } from "./explain-types";
import { formatRub } from "@/lib/utils";
import { getDecisionLabel, getSpendStatusPhrase } from "./copy";

export type { AnswerCardData, ExplainStep, FieldHint } from "./explain-types";

export const FORM_FIELD_HINTS = {
  income: {
    label: "Доход за месяц",
    why: "Сколько денег вы ожидаете получить до конца месяца",
    example: "Зарплата, подработка — суммой",
  },
  balance: {
    label: "На счёте сейчас",
    why: "Сколько уже лежит на карте или счёте — учитываем в расчёте",
    example: "Не обязательно тратить всё, но это ваш запас",
  },
  mandatory: {
    label: "Обязательные траты",
    why: "То, что нужно заплатить в любом случае — иначе будут проблемы",
    example: "Аренда + кредиты + коммуналка одной суммой",
  },
  reserve: {
    label: "Минимум на счёте",
    why: "Подушка безопасности — ниже этой суммы опускаться нельзя",
    example: "Обычно 1–2 месяца расходов",
  },
  purchase: {
    label: "Цена покупки",
    why: "Проверим, можно ли купить сейчас без вреда бюджету",
    example: "0 — если покупку не планируете",
  },
} as const satisfies Record<string, FieldHint>;

export function buildExplainSteps(
  input: BudgetInput,
  core: BudgetCore,
  effectiveSavingsMonthly?: number,
): ExplainStep[] {
  const savingsAmount = effectiveSavingsMonthly ?? input.savingsMonthly;
  const steps: ExplainStep[] = [];

  if (input.currentBalance > 0) {
    steps.push({
      id: "balance",
      label: "На счёте сейчас",
      amount: input.currentBalance,
      why: "Деньги, которые уже у вас",
      kind: "plus",
    });
  }

  if (input.incomeMonthly > 0) {
    steps.push({
      id: "income",
      label: "Доход за месяц",
      amount: input.incomeMonthly,
      why: "Ожидаемые поступления в этом месяце",
      kind: "plus",
    });
  }

  steps.push({
    id: "total",
    label: "Всего денег",
    amount: core.totalResources,
    why: "Счёт + доход — весь «кошелёк» на этот месяц",
    kind: "equals",
  });

  if (input.mandatoryMonthly > 0) {
    steps.push({
      id: "mandatory",
      label: "Обязательные траты",
      amount: input.mandatoryMonthly,
      why: "Аренда, кредиты, коммуналка — сначала закрываем их",
      kind: "minus",
    });
  }

  if (savingsAmount > 0) {
    steps.push({
      id: "savings",
      label: "Копилка / цели",
      amount: savingsAmount,
      why:
        effectiveSavingsMonthly != null &&
        effectiveSavingsMonthly > input.savingsMonthly
          ? `В том числе взнос на цель с вкладки «Накопить» (итого ${savingsAmount.toLocaleString("ru-RU")} ₽/мес)`
          : "Откладываете каждый месяц — не тратим",
      kind: "minus",
    });
  }

  if (input.plannedVariableMonthly > 0) {
    steps.push({
      id: "variable",
      label: "Плановые траты",
      amount: input.plannedVariableMonthly,
      why: "Еда, транспорт — уже заложено в бюджет",
      kind: "minus",
    });
  }

  steps.push({
    id: "reserve",
    label: "Минимум на счёте",
    amount: input.minimumBalance,
    why: "Подушка — эту сумму не трогаем",
    kind: "minus",
  });

  steps.push({
    id: "life",
    label: "На жизнь",
    amount: core.availableForLife,
    why: "Остаётся на еду, отдых, бытовые покупки",
    kind: "result",
  });

  return steps;
}

export function buildAnswerCards(
  input: BudgetInput,
  core: BudgetCore,
  purchase: PurchaseDecision | undefined,
  purchasePrice: number,
): AnswerCardData[] {
  const fromBalance = Math.max(0, core.availableForLife - core.freeBudgetMonthly);

  const spendCard: AnswerCardData = {
    id: "spend",
    title: "Сколько тратить",
    value: formatRub(core.freeBudgetMonthly),
    subtitle:
      fromBalance > 0
        ? `+ ${formatRub(fromBalance)} с текущего счёта`
        : "стабильно из дохода каждый месяц",
    why:
      fromBalance > 0
        ? `Из зарплаты остаётся ${formatRub(core.freeBudgetMonthly)}. Ещё ${formatRub(fromBalance)} можно потратить с накопленного счёта — всего ${formatRub(core.availableForLife)} в этом месяце.`
        : "Доход минус обязательное, копилка и запланированные траты.",
    tone: core.freeBudgetMonthly < 0 ? "danger" : "primary",
  };

  const statusTone: AnswerCardData["tone"] =
    core.flowSafetyStatus === "healthy"
      ? "success"
      : core.flowSafetyStatus === "caution"
        ? "warning"
        : "danger";

  const statusCard: AnswerCardData = {
    id: "status",
    title: "Состояние бюджета",
    value: getSpendStatusPhrase(core.flowSafetyStatus),
    subtitle: `${core.flowSafetyLabel} · ${core.reserveSafetyLabel}`,
    why:
      core.flowSafetyStatus === "healthy"
        ? `Поток из дохода ${formatRub(core.freeBudgetMonthly)}/мес. ${core.reserveSafetyLabel.toLowerCase()}.`
        : core.flowSafetyStatus === "caution"
          ? "Деньги есть, но запас тонкий — лишние траты могут создать стресс."
          : "Расходы съедают доход — сначала стабилизируйте бюджет.",
    tone: statusTone,
  };

  let purchaseCard: AnswerCardData;

  if (purchasePrice <= 0) {
    purchaseCard = {
      id: "purchase",
      title: "Покупка",
      value: "Не проверяем",
      subtitle: "Укажите цену, если хотите",
      why: "Система подскажет: купить сейчас, подождать или отложить.",
      tone: "neutral",
    };
  } else if (purchase) {
    const purchaseTone: AnswerCardData["tone"] =
      purchase.decision === "buy_now"
        ? "success"
        : purchase.decision === "wait"
          ? "warning"
          : "danger";

    purchaseCard = {
      id: "purchase",
      title: "Покупка",
      value: getDecisionLabel(purchase.decision, purchase.monthsToPurchase),
      subtitle: `Цена ${formatRub(purchasePrice)} · сейчас доступно ${formatRub(core.availableForPurchaseNow)}`,
      why:
        purchase.decision === "build_reserve"
          ? `На счёте ${formatRub(input.currentBalance)}, но после покупки останется ${formatRub(Math.max(0, purchase.reserveAfterPurchase))} — ниже минимума ${formatRub(input.minimumBalance)}.`
          : purchase.missingAmount > 0
            ? `Не хватает ${formatRub(purchase.missingAmount)} с текущего баланса с учётом резерва и обязательных платежей.`
            : `На счёте хватает: после покупки останется ${formatRub(Math.max(0, purchase.reserveAfterPurchase))} — выше минимума ${formatRub(input.minimumBalance)}.`,
      tone: purchaseTone,
    };
  } else {
    purchaseCard = {
      id: "purchase",
      title: "Покупка",
      value: "—",
      subtitle: "",
      why: "",
      tone: "neutral",
    };
  }

  return [spendCard, statusCard, purchaseCard];
}

export function getMonthlyFlowExplanation(
  input: BudgetInput,
  core: BudgetCore,
  effectiveSavingsMonthly?: number,
): string {
  const savings = effectiveSavingsMonthly ?? input.savingsMonthly;
  const parts = [
    `${formatRub(input.incomeMonthly)} доход`,
    input.mandatoryMonthly > 0 && `− ${formatRub(input.mandatoryMonthly)} обязательное`,
    input.plannedVariableMonthly > 0 &&
      `− ${formatRub(input.plannedVariableMonthly)} плановые траты`,
    savings > 0 && `− ${formatRub(savings)} отложения`,
  ].filter(Boolean);

  return `${parts.join(" ")} = ${formatRub(core.freeBudgetMonthly)} из дохода`;
}

export function getPurchaseFlowExplanation(
  input: BudgetInput,
  core: BudgetCore,
  purchasePrice: number,
): string | null {
  if (purchasePrice <= 0) return null;
  return `${formatRub(input.currentBalance)} на счёте − ${formatRub(input.minimumBalance)} резерв − ${formatRub(core.upcomingMandatoryFromBalance)} обязательное с баланса = ${formatRub(core.availableForPurchaseNow)} можно потратить на покупку сейчас`;
}
