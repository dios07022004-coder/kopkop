import { formatRub } from "@/lib/utils";
import {
  getMonthlyFlowExplanation,
} from "./explain";
import {
  getDecisionLabel,
  getPurchaseShortRule,
} from "./copy";
import { formatMonthsText } from "./savings-copy";
import {
  assessPlanConfidence,
  buildImprovementHints,
  type PlanConfidence,
} from "./improvement-hints";
import type { ImprovementHint } from "./improvement-hints";
import {
  buildCardSpendBreakdown,
  buildWhyChainSteps,
  type WhyChainStep,
} from "./verify-calculation";
import type {
  BudgetInput,
  FinanceResult,
  PurchaseDecisionType,
  SafetyStatus,
  SavingsGoalInput,
} from "./types";

export type { WhyChainStep };

export type BudgetMood = "calm" | "caution" | "danger";

export interface PlanViewModel {
  spendMonth: PlanLimitBlock;
  spendSalary: PlanLimitBlock;
  spendCard: PlanLimitBlock;
  budget: {
    mood: BudgetMood;
    label: string;
    explain: string;
    nextStep: string;
  };
  purchase: PlanPurchaseBlock;
  goal: PlanGoalBlock;
  whyChain: WhyChainStep[];
  warnings: string[];
  improvementHints: ImprovementHint[];
  confidence: {
    level: PlanConfidence;
    label: string;
    explain: string;
    checks: string[];
  };
}

export interface PlanLimitBlock {
  formatted: string;
  explain: string;
  nextStep: string;
  breakdown?: string;
}

/** План накопления — покупка или крупная цель */
export interface PlanAccumulationInfo {
  title: string;
  toSave: string;
  timeline: string;
  monthlyRate: string;
  fundingSource: string;
  lifeImpact: string | null;
}

export interface PlanPurchaseBlock {
  active: boolean;
  verdict: string;
  shortRule: string | null;
  explain: string;
  ifBuyNow: string | null;
  nextStep: string;
  tone: "success" | "warning" | "danger" | "muted";
  accumulation: PlanAccumulationInfo | null;
}

export interface PlanGoalBlock {
  active: boolean;
  name: string;
  remaining: string;
  monthlyNeeded: string;
  monthsToGoal: string;
  monthlyActual: string;
  fitsFlow: boolean;
  explain: string;
  nextStep: string;
  statusLabel: string;
  tone: "success" | "warning" | "danger" | "muted";
  accumulation: PlanAccumulationInfo | null;
}

export interface PlanViewOptions {
  buying: boolean;
  saving: boolean;
  purchasePrice: number;
}

function moodFromStatus(status: SafetyStatus): BudgetMood {
  switch (status) {
    case "healthy":
      return "calm";
    case "caution":
      return "caution";
    case "danger":
      return "danger";
  }
}

function worstMood(a: BudgetMood, b: BudgetMood): BudgetMood {
  const rank = { calm: 0, caution: 1, danger: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function flowStatusPhrase(status: SafetyStatus): string {
  switch (status) {
    case "healthy":
      return "Поток из зарплаты в порядке";
    case "caution":
      return "Поток из зарплаты тонкий";
    case "danger":
      return "Из зарплаты на жизнь не остаётся";
  }
}

function moodLabel(mood: BudgetMood): string {
  switch (mood) {
    case "calm":
      return "Спокойно";
    case "caution":
      return "Осторожно";
    case "danger":
      return "Опасно";
  }
}

function purchaseTone(
  decision: PurchaseDecisionType | undefined,
): PlanPurchaseBlock["tone"] {
  switch (decision) {
    case "buy_now":
      return "success";
    case "wait":
      return "warning";
    case "build_reserve":
    case "defer":
      return "danger";
    default:
      return "muted";
  }
}

function buildIfBuyNow(
  budget: BudgetInput,
  purchase: FinanceResult["purchase"],
  price: number,
): string | null {
  if (!purchase || price <= 0) return null;
  const after = purchase.reserveAfterPurchase;
  const min = budget.minimumBalance;
  if (purchase.decision === "buy_now") {
    return `Если купить сейчас, на счёте останется ${formatRub(Math.max(0, after))} — подушка ${formatRub(min)} сохранится.`;
  }
  if (purchase.decision === "build_reserve") {
    return `Если купить сейчас, на счёте будет ${formatRub(Math.max(0, after))} — это ниже подушки ${formatRub(min)}. Лучше подождать.`;
  }
  if (after >= 0 && price > 0) {
    return `Если купить сейчас, на счёте останется ${formatRub(after)} (минимум ${formatRub(min)}).`;
  }
  return null;
}

function buildSanityWarnings(
  budget: BudgetInput,
  result: FinanceResult,
  goal: SavingsGoalInput,
  options: PlanViewOptions,
): string[] {
  const warnings: string[] = [];
  const { core } = result;

  if (budget.incomeMonthly <= 0 && budget.currentBalance <= 0) {
    warnings.push("Укажите доход или сумму на счёте — иначе расчёт будет пустым.");
  }
  if (
    budget.incomeMonthly > 0 &&
    budget.mandatoryMonthly > budget.incomeMonthly
  ) {
    warnings.push(
      "Обязательные траты больше дохода — сценарий напряжённый, сначала сократите расходы.",
    );
  }
  if (
    budget.minimumBalance > 0 &&
    budget.currentBalance < budget.minimumBalance
  ) {
    warnings.push(
      `На счёте меньше подушки (${formatRub(budget.minimumBalance)}) — это отдельно от зарплаты.`,
    );
  }
  if (options.saving && goal.targetAmount > 0 && core.freeBudgetMonthly <= 0) {
    warnings.push(
      "Копилка съедает весь свободный доход из зарплаты — на жизнь почти ничего не остаётся.",
    );
  }
  if (
    options.saving &&
    result.savingsGoal?.status === "impossible"
  ) {
    warnings.push(
      "При текущем доходе цель не получится — увеличьте взнос, срок или доход.",
    );
  }
  if (
    options.saving &&
    result.savingsGoal?.status === "warning" &&
    result.savingsGoal.requiredMonthly != null
  ) {
    warnings.push(
      `Срок выглядит коротким — нужно ${formatRub(result.savingsGoal.requiredMonthly)}/мес, а откладываете ${formatRub(result.savingsGoal.effectiveContribution)}.`,
    );
  }
  return warnings;
}

function buildSpendSalaryBlock(
  budget: BudgetInput,
  result: FinanceResult,
): PlanLimitBlock {
  const { core } = result;
  const savings =
    result.goalContributionApplied ?? budget.savingsMonthly;
  const flow = getMonthlyFlowExplanation(budget, core, savings);

  return {
    formatted: `${formatRub(Math.max(0, core.freeBudgetMonthly))}/мес`,
    explain:
      core.freeBudgetMonthly > 0
        ? `${flow}. Это лимит из зарплаты каждый месяц.`
        : "Из зарплаты после обязательного и отложений на жизнь не остаётся.",
    nextStep:
      core.freeBudgetMonthly > 0
        ? `Ориентируйтесь на ${formatRub(core.freeBudgetMonthly)}/мес из дохода — стабильная часть бюджета.`
        : "Сократите отложения или обязательные траты, либо увеличьте доход.",
  };
}

function buildSpendCardBlock(
  budget: BudgetInput,
  result: FinanceResult,
): PlanLimitBlock {
  const { core } = result;
  const breakdown = buildCardSpendBreakdown(budget, core);

  let nextStep: string;
  if (core.availableForPurchaseNow > 0) {
    nextStep = `Можно взять с карты до ${formatRub(core.availableForPurchaseNow)} — подушка ${formatRub(budget.minimumBalance)} не пострадает.`;
  } else if (result.purchase?.missingAmount && result.purchase.missingAmount > 0) {
    const monthly =
      result.purchase.monthsToPurchase != null && result.purchase.monthsToPurchase > 0
        ? Math.ceil(result.purchase.missingAmount / result.purchase.monthsToPurchase)
        : null;
    nextStep = monthly
      ? `Не тратьте с карты сейчас. Для покупки отложите ${formatRub(monthly)}/мес из зарплаты или пополните счёт на ${formatRub(result.purchase.missingAmount)}.`
      : `Не тратьте с карты сейчас. Дождитесь дохода или пополните счёт на ${formatRub(result.purchase.missingAmount)}.`;
  } else {
    nextStep =
      "Не тратьте с карты сейчас — сначала закройте ближайшее обязательное и сохраните подушку.";
  }

  return {
    formatted: formatRub(core.availableForPurchaseNow),
    explain:
      core.availableForPurchaseNow > 0
        ? "Это лимит прямо сейчас с карты — отдельно от месячного лимита выше."
        : "С карты сейчас безопасно 0 ₽. Месячный лимит выше — это про весь месяц с учётом дохода, не про «прямо сейчас».",
    breakdown,
    nextStep,
  };
}

function buildSpendMonthBlock(
  budget: BudgetInput,
  result: FinanceResult,
): PlanLimitBlock {
  const { core } = result;
  const fromSalary = Math.max(0, core.freeBudgetMonthly);
  const fromBalance = Math.max(0, core.availableForLife - fromSalary);

  return {
    formatted: formatRub(core.availableForLife),
    explain:
      fromBalance > 0
        ? `Лимит на весь месяц: ${formatRub(fromSalary)} из зарплаты + ${formatRub(fromBalance)} учтено со счёта. Это не «можно сейчас с карты» — безопасная сумма с карты указана отдельно ниже.`
        : `Лимит на весь месяц после обязательного, отложений и подушки — ${formatRub(core.availableForLife)}.`,
    nextStep:
      core.availableForLife > 0
        ? `Можно распределить до ${formatRub(core.availableForLife)} на жизнь в этом месяце — не путайте с «прямо с карты».`
        : "Сначала закройте обязательное и восстановите подушку.",
  };
}

function buildBudgetBlock(
  budget: BudgetInput,
  result: FinanceResult,
): PlanViewModel["budget"] {
  const { core } = result;
  const mood = worstMood(
    moodFromStatus(core.flowSafetyStatus),
    moodFromStatus(core.reserveSafetyStatus),
  );

  const afterMandatory = core.balanceAfterMandatory;
  const cushionGap = budget.minimumBalance - afterMandatory;
  let riskDetail = "";
  if (core.reserveSafetyStatus !== "healthy" && budget.minimumBalance > 0) {
    if (afterMandatory < budget.minimumBalance) {
      riskDetail = ` После ближайших обязательных на счёте останется ${formatRub(Math.max(0, afterMandatory))} — это на ${formatRub(Math.max(0, cushionGap))} ниже подушки ${formatRub(budget.minimumBalance)}.`;
    } else if (budget.currentBalance < budget.minimumBalance) {
      riskDetail = ` На счёте ${formatRub(budget.currentBalance)} — ниже подушки ${formatRub(budget.minimumBalance)} на ${formatRub(budget.minimumBalance - budget.currentBalance)}.`;
    }
  }

  let nextStep: string;
  if (core.flowSafetyStatus === "danger") {
    nextStep =
      "Сократите обязательные или увеличьте доход — из зарплаты на жизнь не остаётся.";
  } else if (core.reserveSafetyStatus === "danger") {
    nextStep = `Пополните счёт минимум на ${formatRub(Math.max(0, cushionGap))} — иначе подушка под угрозой после обязательных.`;
  } else if (mood === "caution") {
    nextStep = `Держитесь лимита ${formatRub(Math.max(0, core.freeBudgetMonthly))}/мес из зарплаты и не тратьте с карты сверх ${formatRub(core.availableForPurchaseNow)}.`;
  } else {
    nextStep = `Можно тратить спокойно в пределах ${formatRub(Math.max(0, core.freeBudgetMonthly))}/мес из зарплаты.`;
  }

  const moodReason =
    mood === "caution" && core.flowSafetyStatus === "healthy"
      ? `Осторожно из‑за запаса на счёте, не из‑за зарплаты.${riskDetail}`
      : mood === "caution"
        ? `Запас тонкий.${riskDetail}`
        : riskDetail;

  return {
    mood,
    label: moodLabel(mood),
    explain: `${flowStatusPhrase(core.flowSafetyStatus)}.${moodReason}`,
    nextStep,
  };
}

function buildPurchaseActionNext(
  budget: BudgetInput,
  result: FinanceResult,
  price: number,
): string {
  const p = result.purchase;
  if (!p) return "Заполните цену покупки.";

  const { core } = result;

  switch (p.decision) {
    case "buy_now":
      return "Можно покупать — проверьте, что обязательные в этом месяце учтены.";
    case "wait":
      return "Запишите покупку и вернитесь через 7 дней — часто желание проходит.";
    case "build_reserve": {
      const gap = Math.max(0, budget.minimumBalance - p.reserveAfterPurchase);
      return `Сначала пополните подушку на ${formatRub(gap)}, затем возвращайтесь к покупке ${formatRub(price)}.`;
    }
    case "defer": {
      if (p.missingAmount > 0 && p.monthsToPurchase) {
        const monthly = Math.ceil(p.missingAmount / p.monthsToPurchase);
        const left = Math.max(0, core.freeBudgetMonthly - monthly);
        return left > 0
          ? `Отложите ${formatRub(monthly)}/мес на покупку — на жизнь останется ${formatRub(left)}/мес. Или снизьте сумму покупки.`
          : `Отложите покупку на ${formatMonthsText(p.monthsToPurchase)} или снизьте цену — иначе на жизнь из зарплаты не останется.`;
      }
      return "Стабилизируйте бюджет, затем вернитесь к покупке.";
    }
  }
}

function buildPurchaseAccumulation(
  budget: BudgetInput,
  result: FinanceResult,
  price: number,
): PlanAccumulationInfo | null {
  const p = result.purchase;
  const { core } = result;
  if (!p || price <= 0) return null;

  if (p.decision === "build_reserve") {
    const gap = Math.max(0, budget.minimumBalance - p.reserveAfterPurchase);
    return {
      title: "Сначала восстановить подушку",
      toSave: formatRub(gap),
      timeline: "до покупки",
      monthlyRate:
        core.freeBudgetMonthly > 0
          ? `${formatRub(core.freeBudgetMonthly)}/мес`
          : "—",
      fundingSource: `На счёте после покупки будет ${formatRub(Math.max(0, p.reserveAfterPurchase))} — это ниже подушки ${formatRub(budget.minimumBalance)}. Пополните резерв, не трогая обязательное.`,
      lifeImpact: null,
    };
  }

  if (p.missingAmount <= 0) return null;

  const months = p.monthsToPurchase;
  if (months == null || months <= 0) return null;

  const monthlyNeeded = Math.ceil(p.missingAmount / months);
  const free = core.freeBudgetMonthly;
  const leftForLife = Math.max(0, free - monthlyNeeded);
  const fromCard = core.availableForPurchaseNow;

  let fundingSource: string;
  if (fromCard > 0) {
    fundingSource = `С карты уже безопасно ${formatRub(fromCard)}. Докопить ${formatRub(p.missingAmount)} — из зарплаты (свободно ${formatRub(free)}/мес).`;
  } else {
    fundingSource = `С карты сейчас 0 ₽ — все ${formatRub(p.missingAmount)} только из зарплаты. Свободно ${formatRub(free)}/мес после обязательного.`;
  }

  let lifeImpact: string | null = null;
  if (free > 0) {
    if (monthlyNeeded >= free) {
      lifeImpact = `Если откладывать ${formatRub(monthlyNeeded)}/мес на покупку — на жизнь из зарплаты не останется (лимит сейчас ${formatRub(free)}/мес).`;
    } else {
      lifeImpact = `Если копить ${formatRub(monthlyNeeded)}/мес на покупку — на жизнь из зарплаты останется ${formatRub(leftForLife)}/мес.`;
    }
  }

  return {
    title: `Копить на покупку ${formatRub(price)}`,
    toSave: formatRub(p.missingAmount),
    timeline: formatMonthsText(months),
    monthlyRate: `${formatRub(monthlyNeeded)}/мес`,
    fundingSource,
    lifeImpact,
  };
}

function buildGoalAccumulation(
  result: FinanceResult,
  goal: SavingsGoalInput,
): PlanAccumulationInfo | null {
  const sg = result.savingsGoal;
  if (!sg || goal.targetAmount <= 0 || sg.status === "achieved") return null;

  const freeBefore =
    result.freeBudgetBeforeGoal ?? result.core.freeBudgetMonthly;
  const freeAfter = sg.freeAfterGoal ?? result.core.freeBudgetMonthly;
  const name = goal.goalName || "цель";

  let fundingSource = `Откладываете ${formatRub(sg.effectiveContribution)}/мес из дохода — свободно ${formatRub(freeBefore)}/мес после обязательного.`;
  if (freeAfter > 0) {
    fundingSource += ` После взноса на жизнь из зарплаты останется ${formatRub(freeAfter)}/мес.`;
  } else if (sg.effectiveContribution > 0) {
    fundingSource += ` На траты из зарплаты не останется — жить можно из «${formatRub(result.core.availableForLife)}» на этот месяц (зарплата + счёт).`;
  }
  if (sg.reserveNote) {
    fundingSource += ` ${sg.reserveNote}`;
  }

  const lifeInsight =
    sg.insights.find(
      (i) =>
        i.includes("жизнь") ||
        i.includes("свободный доход") ||
        i.includes("останется"),
    ) ?? null;

  return {
    title: `Коплю на «${name}»`,
    toSave: formatRub(sg.remainingToSave),
    timeline:
      sg.monthsToGoal != null ? formatMonthsText(sg.monthsToGoal) : "—",
    monthlyRate: `${formatRub(sg.effectiveContribution)}/мес`,
    fundingSource,
    lifeImpact: lifeInsight,
  };
}

function buildPurchaseBlock(
  budget: BudgetInput,
  result: FinanceResult,
  options: PlanViewOptions,
): PlanPurchaseBlock {
  if (!options.buying || options.purchasePrice <= 0) {
    return {
      active: false,
      verdict: "—",
      shortRule: null,
      explain: "Покупку не проверяем — включите «Хочу купить» и укажите цену.",
      ifBuyNow: null,
      nextStep: "Откройте «Подробности» → «Хочу купить».",
      tone: "muted",
      accumulation: null,
    };
  }

  const p = result.purchase;
  if (!p) {
    return {
      active: true,
      verdict: "—",
      shortRule: null,
      explain: "Укажите цену покупки.",
      ifBuyNow: null,
      nextStep: "Заполните стоимость в блоке «Хочу купить».",
      tone: "muted",
      accumulation: null,
    };
  }

  const shortRule = getPurchaseShortRule(p.decision, {
    missingAmount: p.missingAmount,
    availableForPurchaseNow: result.core.availableForPurchaseNow,
    minimumBalance: budget.minimumBalance,
    reserveAfterPurchase: p.reserveAfterPurchase,
    monthsToPurchase: p.monthsToPurchase,
  });

  return {
    active: true,
    verdict: getDecisionLabel(p.decision, p.monthsToPurchase),
    shortRule,
    explain: p.explanation,
    ifBuyNow: buildIfBuyNow(budget, p, options.purchasePrice),
    nextStep: buildPurchaseActionNext(budget, result, options.purchasePrice),
    tone: purchaseTone(p.decision),
    accumulation: buildPurchaseAccumulation(
      budget,
      result,
      options.purchasePrice,
    ),
  };
}

function goalTone(
  status: NonNullable<FinanceResult["savingsGoal"]>["status"],
): PlanGoalBlock["tone"] {
  switch (status) {
    case "ok":
    case "achieved":
      return "success";
    case "warning":
      return "warning";
    case "risk":
    case "impossible":
      return "danger";
    default:
      return "muted";
  }
}

function buildGoalBlock(
  result: FinanceResult,
  goal: SavingsGoalInput,
  options: PlanViewOptions,
): PlanGoalBlock {
  if (!options.saving || goal.targetAmount <= 0 || !result.savingsGoal) {
    return {
      active: false,
      name: "",
      remaining: "—",
      monthlyNeeded: "—",
      monthsToGoal: "—",
      monthlyActual: "—",
      fitsFlow: true,
      explain: "Цель не задана — включите «Коплю» и укажите сумму.",
      nextStep: "Откройте «Подробности» → «Коплю на что-то большое».",
      statusLabel: "—",
      tone: "muted",
      accumulation: null,
    };
  }

  const sg = result.savingsGoal;
  const freeAfter = sg.freeAfterGoal ?? result.core.freeBudgetMonthly;

  return {
    active: true,
    name: goal.goalName || "Цель",
    remaining: formatRub(sg.remainingToSave),
    monthlyNeeded:
      sg.requiredMonthly != null ? formatRub(sg.requiredMonthly) : "—",
    monthsToGoal:
      sg.monthsToGoal != null ? `${sg.monthsToGoal} мес` : "—",
    monthlyActual: formatRub(sg.effectiveContribution),
    fitsFlow: freeAfter >= 0,
    explain: sg.summary,
    nextStep: sg.nextStep,
    statusLabel: sg.statusLabel,
    tone: goalTone(sg.status),
    accumulation: buildGoalAccumulation(result, goal),
  };
}

/** Single view-model for /app — all numbers from FinanceResult */
export function buildPlanViewModel(
  budget: BudgetInput,
  result: FinanceResult,
  goal: SavingsGoalInput,
  options: PlanViewOptions,
  extras?: {
    purchaseInput?: Partial<import("./types").PurchaseInput>;
  },
): PlanViewModel {
  return {
    spendMonth: buildSpendMonthBlock(budget, result),
    spendSalary: buildSpendSalaryBlock(budget, result),
    spendCard: buildSpendCardBlock(budget, result),
    budget: buildBudgetBlock(budget, result),
    purchase: buildPurchaseBlock(budget, result, options),
    goal: buildGoalBlock(result, goal, options),
    whyChain: buildWhyChainSteps(budget, result),
    warnings: buildSanityWarnings(budget, result, goal, options),
    improvementHints: buildImprovementHints(
      budget,
      result,
      extras?.purchaseInput,
      goal,
      options,
    ),
    confidence: assessPlanConfidence(budget),
  };
}

export function formatPlanViewText(view: PlanViewModel): string {
  const lines = [
    "Мой план денег",
    "",
    `На жизнь в месяце: ${view.spendMonth.formatted}`,
    view.spendMonth.explain,
    "",
    `Из зарплаты: ${view.spendSalary.formatted}`,
    view.spendSalary.explain,
    "",
    `С карты без риска: ${view.spendCard.formatted}`,
    view.spendCard.explain,
    "",
    `Покупка: ${view.purchase.verdict}`,
    view.purchase.explain,
    view.purchase.ifBuyNow ?? "",
    `→ ${view.purchase.nextStep}`,
    "",
    `Бюджет: ${view.budget.label}`,
    view.budget.explain,
    `→ ${view.budget.nextStep}`,
  ];
  if (view.goal.active && view.goal.accumulation) {
    lines.push(
      "",
      view.goal.accumulation.title,
      `Накопить: ${view.goal.accumulation.toSave} за ${view.goal.accumulation.timeline}`,
      view.goal.accumulation.fundingSource,
    );
  }
  if (view.purchase.accumulation) {
    lines.push(
      "",
      view.purchase.accumulation.title,
      `Накопить: ${view.purchase.accumulation.toSave} за ${view.purchase.accumulation.timeline}`,
      view.purchase.accumulation.fundingSource,
      view.purchase.accumulation.lifeImpact ?? "",
    );
  }
  return lines.filter(Boolean).join("\n");
}

/** Compare two view models for scenario diff */
export function diffPlanSnapshots(
  before: Pick<
    PlanViewModel,
    | "spendMonth"
    | "spendSalary"
    | "spendCard"
    | "purchase"
    | "budget"
    | "goal"
  >,
  after: Pick<
    PlanViewModel,
    | "spendMonth"
    | "spendSalary"
    | "spendCard"
    | "purchase"
    | "budget"
    | "goal"
  >,
): {
  label: string;
  before: string;
  after: string;
  improved: boolean | null;
}[] {
  const rows: {
    label: string;
    before: string;
    after: string;
    improved: boolean | null;
  }[] = [];
  const pairs = [
    ["На жизнь", before.spendMonth.formatted, after.spendMonth.formatted],
    ["Из зарплаты", before.spendSalary.formatted, after.spendSalary.formatted],
    ["С карты", before.spendCard.formatted, after.spendCard.formatted],
    ["Покупка", before.purchase.verdict, after.purchase.verdict],
    ["Бюджет", before.budget.label, after.budget.label],
  ] as const;
  for (const [label, b, a] of pairs) {
    if (b !== a) {
      rows.push({ label, before: b, after: a, improved: null });
    }
  }
  if (before.goal.active || after.goal.active) {
    const bg = before.goal.monthsToGoal;
    const ag = after.goal.monthsToGoal;
    if (bg !== ag) {
      rows.push({
        label: "Срок цели",
        before: bg,
        after: ag,
        improved: null,
      });
    }
  }
  return rows;
}
