/**
 * @deprecated Use @/lib/finance instead. Thin compatibility layer.
 */
import {
  computeFinance,
  DEFAULT_BUDGET_INPUT,
  DEFAULT_PURCHASE_INPUT,
  type PurchaseDecisionType,
} from "@/lib/finance";
import type { CalculatorInput, CalculatorResult } from "@/types";

export function calculatePurchaseDecision(input: CalculatorInput): CalculatorResult {
  const result = computeFinance(
    {
      incomeMonthly: input.monthlyIncome,
      currentBalance: input.currentCash,
      mandatoryMonthly: input.fixedExpenses + input.debtPayments,
      plannedVariableMonthly: input.variableExpenses,
      savingsMonthly: input.savingsGoal,
      minimumBalance: input.mandatoryReserveAmount,
    },
    {
      price: input.desiredPurchasePrice,
      urgency: input.desiredPurchaseUrgency,
      usefulness: input.desiredPurchaseUsefulness,
    },
  );

  const { core, purchase } = result;
  if (!purchase) throw new Error("Purchase decision missing");

  return {
    remainingAfterFixed: core.remainingAfterMandatory,
    freeBudget: core.freeBudgetMonthly,
    availableForPurchase: core.availableForPurchaseNow,
    missingAmount: purchase.missingAmount,
    monthsToPurchase: purchase.monthsToPurchase ?? 0,
    decision: purchase.decision,
    decisionLabel: purchase.decisionLabel,
    explanation: purchase.explanation,
    budgetStatus: core.safetyStatus,
    budgetStatusLabel: core.safetyStatusLabel,
    reserveProgress: core.reserveProgress,
    reserveAfterPurchase: purchase.reserveAfterPurchase,
    canAffordNow: purchase.canAffordNow,
  };
}

export const DEFAULT_CALCULATOR_INPUT: CalculatorInput = {
  monthlyIncome: DEFAULT_BUDGET_INPUT.incomeMonthly,
  fixedExpenses: 35000,
  variableExpenses: DEFAULT_BUDGET_INPUT.plannedVariableMonthly,
  debtPayments: 5000,
  savingsGoal: DEFAULT_BUDGET_INPUT.savingsMonthly,
  currentCash: DEFAULT_BUDGET_INPUT.currentBalance,
  desiredPurchasePrice: DEFAULT_PURCHASE_INPUT.price,
  desiredPurchaseUrgency: DEFAULT_PURCHASE_INPUT.urgency,
  desiredPurchaseUsefulness: DEFAULT_PURCHASE_INPUT.usefulness,
  mandatoryReserveAmount: DEFAULT_BUDGET_INPUT.minimumBalance,
};

export function getDecisionColor(decision: PurchaseDecisionType): string {
  switch (decision) {
    case "buy_now":
      return "success";
    case "wait":
      return "warning";
    case "defer":
    case "build_reserve":
      return "danger";
  }
}
