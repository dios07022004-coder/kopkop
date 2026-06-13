import {
  URGENCY_WAIT_MAX,
  USEFULNESS_WAIT_MAX,
} from "./constants";
import { getDecisionLabel, getPurchaseExplanation } from "./copy";
import type {
  BudgetCore,
  PurchaseDecision,
  PurchaseInput,
} from "./types";

export function decidePurchase(
  core: BudgetCore,
  purchase: PurchaseInput,
  minimumBalance: number,
  currentBalance: number,
  options?: { savingsMonthly?: number },
): PurchaseDecision {
  const missingAmount = Math.max(
    0,
    purchase.price - core.availableForPurchaseNow,
  );

  const monthsToPurchase =
    missingAmount > 0 && core.freeBudgetMonthly > 0
      ? missingAmount <= core.freeBudgetMonthly
        ? 1
        : Math.ceil(missingAmount / core.freeBudgetMonthly)
      : null;

  const reserveAfterPurchase = currentBalance - purchase.price;
  const canAffordSafely = missingAmount === 0;
  const canAffordFromBalance = currentBalance >= purchase.price;

  let decision: PurchaseDecision["decision"];

  // Priority tree — top to bottom
  if (
    canAffordFromBalance &&
    reserveAfterPurchase < minimumBalance
  ) {
    decision = "build_reserve";
  } else if (missingAmount > 0 && core.freeBudgetMonthly <= 0) {
    decision = "defer";
  } else if (missingAmount > 0 && core.freeBudgetMonthly > 0) {
    decision = "defer";
  } else if (canAffordSafely && core.freeBudgetMonthly < 0) {
    decision = "defer";
  } else if (
    canAffordSafely &&
    purchase.urgency <= URGENCY_WAIT_MAX &&
    purchase.usefulness <= USEFULNESS_WAIT_MAX
  ) {
    decision = "wait";
  } else if (canAffordSafely && core.freeBudgetMonthly >= 0) {
    decision = "buy_now";
  } else {
    decision = "defer";
  }

  const { explanation, nextStep } = getPurchaseExplanation(decision, {
    missingAmount,
    monthsToPurchase,
    reserveAfterPurchase,
    minimumBalance,
    freeBudgetMonthly: core.freeBudgetMonthly,
    availableForPurchaseNow: core.availableForPurchaseNow,
    purchasePrice: purchase.price,
    savingsMonthly: options?.savingsMonthly ?? 0,
  });

  return {
    decision,
    decisionLabel: getDecisionLabel(decision, monthsToPurchase),
    explanation,
    nextStep,
    missingAmount,
    monthsToPurchase,
    reserveAfterPurchase,
    canAffordNow: canAffordSafely,
  };
}
