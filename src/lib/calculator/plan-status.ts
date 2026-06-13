import { buildHowCalculatedLines as buildFormulaLines } from "@/lib/finance/verify-calculation";
import {
  CALCULATOR_HERO,
  CALCULATOR_PLAN,
  CALCULATOR_STATUS,
  PURCHASE_DECISION_DISPLAY,
} from "@/data/calculator-copy";
import type { PlanUiFlags } from "@/hooks/use-demo-storage";
import type {
  BudgetInput,
  FinanceResult,
  PurchaseDecisionType,
  SavingsGoalInput,
} from "@/lib/finance";
import { formatRub } from "@/lib/utils";

export interface PlanActionRow {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone: "default" | "success" | "warning" | "danger" | "muted";
}

function formatMonthsShort(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} мес`;
  if (mod10 === 1) return `${count} мес`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} мес`;
  return `${count} мес`;
}

function purchaseDisplayLabel(
  decision: PurchaseDecisionType,
  months: number | null,
): string {
  if (decision === "defer" && months != null && months > 0) {
    return PURCHASE_DECISION_DISPLAY.defer(months);
  }
  switch (decision) {
    case "buy_now":
      return PURCHASE_DECISION_DISPLAY.buy_now;
    case "wait":
      return PURCHASE_DECISION_DISPLAY.wait;
    case "build_reserve":
      return PURCHASE_DECISION_DISPLAY.build_reserve;
    case "defer":
      return PURCHASE_DECISION_DISPLAY.defer(1);
  }
}

function purchaseTone(
  decision: PurchaseDecisionType,
): PlanActionRow["tone"] {
  switch (decision) {
    case "buy_now":
      return "success";
    case "wait":
      return "warning";
    case "build_reserve":
    case "defer":
      return "danger";
    default:
      return "default";
  }
}

export function buildPlanActionRows(
  result: FinanceResult,
  options: {
    goalName: string;
    purchasePrice: number;
    savingsMonthly: number;
    flags: PlanUiFlags;
    compact?: boolean;
  },
): PlanActionRow[] {
  const { core, purchase, savingsGoal } = result;
  const { goalName, purchasePrice, flags, savingsMonthly, compact } = options;
  const effectiveSavings =
    result.goalContributionApplied ?? savingsMonthly;

  const rows: PlanActionRow[] = [];

  if (!compact) {
    rows.push(
      {
        id: "spend-salary",
        label: CALCULATOR_PLAN.spendFromSalary,
        value: `${formatRub(Math.max(0, core.freeBudgetMonthly))}${CALCULATOR_PLAN.perMonth}`,
        tone: core.freeBudgetMonthly <= 0 ? "warning" : "default",
      },
      {
        id: "spend-total",
        label: CALCULATOR_PLAN.spendTotal,
        value: formatRub(core.availableForLife),
        hint: "С учётом денег на счёте и подушки",
        tone: "default",
      },
    );
  }

  if (flags.saving && effectiveSavings > 0) {
    const name = goalName.trim() || "цель";
    rows.push({
      id: "save-goal",
      label:
        options.goalName.trim().length > 0
          ? CALCULATOR_PLAN.saveForGoal(name)
          : CALCULATOR_PLAN.saveForGoalGeneric,
      value: `${formatRub(effectiveSavings)}${CALCULATOR_PLAN.perMonth}`,
      hint: savingsGoal?.statusLabel,
      tone:
        savingsGoal?.status === "ok" || savingsGoal?.status === "achieved"
          ? "success"
          : savingsGoal?.status === "warning"
            ? "warning"
            : savingsGoal?.status === "risk" ||
                savingsGoal?.status === "impossible"
              ? "danger"
              : "default",
    });
  }

  if (flags.buying && purchasePrice > 0 && purchase) {
    if (
      purchase.decision === "defer" &&
      purchase.missingAmount > 0 &&
      purchase.monthsToPurchase != null &&
      core.freeBudgetMonthly > 0
    ) {
      const monthlyNeeded = Math.ceil(
        purchase.missingAmount / purchase.monthsToPurchase,
      );
      rows.push({
        id: "save-purchase",
        label: CALCULATOR_PLAN.saveForPurchase(formatRub(purchasePrice)),
        value: `${formatRub(monthlyNeeded)}${CALCULATOR_PLAN.perMonth}`,
        hint: CALCULATOR_PLAN.deferHint(
          purchase.monthsToPurchase,
          monthlyNeeded >= core.freeBudgetMonthly * 0.9,
        ),
        tone: "warning",
      });
    }

    rows.push({
      id: "purchase-decision",
      label: CALCULATOR_PLAN.purchaseDecision,
      value: purchaseDisplayLabel(
        purchase.decision,
        purchase.monthsToPurchase,
      ),
      hint: purchase.explanation,
      tone: purchaseTone(purchase.decision),
    });
  }

  rows.push({
    id: "from-card",
    label: CALCULATOR_PLAN.fromCard,
    value: formatRub(core.availableForPurchaseNow),
    hint: "Без вреда подушке на счёте",
    tone: "muted",
  });

  return rows;
}

export function getPlanStatusMessage(
  budget: BudgetInput,
  result: FinanceResult,
  goal: SavingsGoalInput,
): string | null {
  const { core } = result;

  if (core.flowSafetyStatus === "danger") {
    return CALCULATOR_STATUS.flowDanger;
  }

  if (budget.currentBalance < budget.minimumBalance && budget.minimumBalance > 0) {
    return CALCULATOR_STATUS.reserveLow(formatRub(budget.minimumBalance));
  }

  const effectiveSavings =
    result.goalContributionApplied ?? budget.savingsMonthly;
  const hasGoal = goal.targetAmount > 0;

  if (hasGoal && effectiveSavings > 0 && core.freeBudgetMonthly <= 0) {
    return CALCULATOR_STATUS.allIncomeToGoal(goal.goalName || "цель");
  }

  return null;
}

export function getHeroSubtitle(
  result: FinanceResult,
  goal: SavingsGoalInput,
): string {
  const { core } = result;
  const effectiveSavings =
    result.goalContributionApplied ?? goal.monthlyContribution ?? 0;
  const hasGoal = goal.targetAmount > 0 && effectiveSavings > 0;

  if (core.freeBudgetMonthly <= 0) {
    return CALCULATOR_HERO.noLifeLeft;
  }

  if (hasGoal) {
    return CALCULATOR_HERO.afterMandatoryAndGoal(
      effectiveSavings.toLocaleString("ru-RU"),
      goal.goalName || "цель",
    );
  }

  return CALCULATOR_HERO.afterMandatoryAndSavings;
}

export function buildHowCalculatedLines(
  budget: BudgetInput,
  result: FinanceResult,
): string[] {
  return buildFormulaLines(budget, result);
}
