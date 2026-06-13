import { describe, expect, it } from "vitest";
import { computeFinance } from "../index";

const carBudget = {
  incomeMonthly: 120_000,
  currentBalance: 45_000,
  mandatoryMonthly: 50_000,
  minimumBalance: 20_000,
  plannedVariableMonthly: 0,
  savingsMonthly: 0,
};

const carGoal = {
  goalName: "Машина",
  targetAmount: 1_000_000,
  currentSaved: 120_000,
  deadlineMonths: 9,
  monthlyContribution: 70_000,
  canUseReserve: true,
  priority: "medium" as const,
};

describe("user scenario: car goal + budget 120k", () => {
  it("budget tab: core numbers and purchase build_reserve", () => {
    const result = computeFinance(
      carBudget,
      { price: 35_000, urgency: 3, usefulness: 4 },
    );

    expect(result.core.freeBudgetMonthly).toBe(70_000);
    expect(result.core.availableForLife).toBe(95_000);
    expect(result.core.availableForPurchaseNow).toBe(0);
    expect(result.core.flowSafetyStatus).toBe("healthy");
    expect(result.core.reserveSafetyStatus).toBe("caution");
    expect(result.purchase?.decision).toBe("build_reserve");
  });

  it("savings tab: warning for deadline miss, not false risk", () => {
    const result = computeFinance(carBudget, undefined, carGoal);

    expect(result.savingsGoal?.remainingToSave).toBe(880_000);
    expect(result.savingsGoal?.requiredMonthly).toBe(97_778);
    expect(result.savingsGoal?.monthsToGoal).toBe(13);
    expect(result.savingsGoal?.safeContribution).toBe(70_000);
    expect(result.savingsGoal?.status).toBe("warning");
    expect(result.savingsGoal?.statusLabel).toBe("Срок слишком короткий");
  });

  it("links tabs: goal contribution reduces free budget in core", () => {
    const result = computeFinance(
      carBudget,
      { price: 35_000 },
      carGoal,
    );

    expect(result.freeBudgetBeforeGoal).toBe(70_000);
    expect(result.goalContributionApplied).toBe(70_000);
    expect(result.core.freeBudgetMonthly).toBe(0);
    expect(result.core.availableForLife).toBe(25_000);
  });

  it("purchase explanation avoids misleading missing amount for build_reserve", () => {
    const result = computeFinance(carBudget, { price: 35_000 });
    expect(result.purchase?.decision).toBe("build_reserve");
    expect(result.purchase?.explanation).toMatch(/10[\s\u00a0]?000/);
    expect(result.purchase?.explanation).toMatch(/20[\s\u00a0]?000/);
  });
});
