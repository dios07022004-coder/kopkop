import { allocateCategories } from "./allocation";
import { computeBudgetCore, buildBreakdown } from "./core";
import { normalizeBudgetInput, parseBudgetInput, parsePurchaseInput } from "./normalize";
import { decidePurchase } from "./purchase-decision";
import {
  computeSavingsGoal,
  normalizeSavingsGoalInput,
} from "./savings-goal";
import type {
  BudgetInput,
  FinanceResult,
  PurchaseInput,
  SavingsGoalInput,
} from "./types";

export * from "./types";
export * from "./constants";
export * from "./normalize";
export * from "./core";
export * from "./allocation";
export * from "./purchase-decision";
export * from "./savings-goal";
export * from "./savings-copy";
export * from "./copy";
export * from "./explain";
export * from "./plan-view";
export * from "./improvement-hints";
export * from "./verify-calculation";
export * from "./pay-cycle";

export function computeFinance(
  rawBudget: Partial<BudgetInput>,
  rawPurchase?: Partial<PurchaseInput>,
  rawSavingsGoal?: Partial<SavingsGoalInput>,
): FinanceResult {
  const input = parseBudgetInput(rawBudget);
  const baseCore = computeBudgetCore(input);

  let savingsInput: SavingsGoalInput | undefined;
  if (rawSavingsGoal !== undefined) {
    savingsInput = normalizeSavingsGoalInput(rawSavingsGoal);
  }

  const goalContribution = savingsInput?.monthlyContribution ?? 0;
  const goalContributionApplied =
    goalContribution > 0
      ? Math.max(input.savingsMonthly, goalContribution)
      : 0;

  const budgetForCore: BudgetInput =
    goalContributionApplied > input.savingsMonthly
      ? { ...input, savingsMonthly: goalContributionApplied }
      : input;

  const core =
    budgetForCore === input ? baseCore : computeBudgetCore(budgetForCore);

  const allocation = allocateCategories(
    core.availableForLife,
    input.categories ?? [],
  );

  const result: FinanceResult = {
    core,
    allocation,
    freeBudgetBeforeGoal: baseCore.freeBudgetMonthly,
    goalContributionApplied:
      goalContributionApplied > input.savingsMonthly
        ? goalContributionApplied
        : undefined,
  };

  if (rawPurchase !== undefined) {
    const purchaseInput = parsePurchaseInput(rawPurchase);
    result.purchase = decidePurchase(
      core,
      purchaseInput,
      input.minimumBalance,
      input.currentBalance,
      { savingsMonthly: input.savingsMonthly },
    );
  }

  if (savingsInput) {
    result.savingsGoal = computeSavingsGoal(baseCore, input, savingsInput, {
      freeBudgetBeforeGoal: baseCore.freeBudgetMonthly,
      freeAfterGoal: core.freeBudgetMonthly,
    });
  }

  return result;
}

export { buildBreakdown };
