import { describe, it, expect } from "vitest";
import { buildPlanViewModel } from "@/lib/finance/plan-view";
import { computeFinance, parseBudgetInput } from "@/lib/finance";

describe("plan view (main screen)", () => {
  it("shows three spend limits with mood and purchase", () => {
    const budget = parseBudgetInput({
      incomeMonthly: 100_000,
      mandatoryMonthly: 50_000,
      savingsMonthly: 20_000,
      currentBalance: 25_000,
      minimumBalance: 25_000,
      plannedVariableMonthly: 0,
    });
    const purchase = { price: 40_000, urgency: 3, usefulness: 4 };
    const result = computeFinance(budget, purchase);
    const view = buildPlanViewModel(
      budget,
      result,
      {
        goalName: "",
        targetAmount: 0,
        currentSaved: 0,
        canUseReserve: false,
        priority: "medium",
      },
      { buying: true, saving: false, purchasePrice: 40_000 },
    );

    expect(view.spendMonth.formatted).toMatch(/₽/);
    expect(view.budget.label).toBeTruthy();
    expect(view.purchase.active).toBe(true);
    expect(view.purchase.nextStep.length).toBeGreaterThan(5);
    expect(view.spendMonth.explain.length).toBeGreaterThan(10);
  });

  it("separates salary and card explanations", () => {
    const budget = parseBudgetInput({
      incomeMonthly: 80_000,
      mandatoryMonthly: 40_000,
      savingsMonthly: 10_000,
      currentBalance: 45_000,
      minimumBalance: 30_000,
      plannedVariableMonthly: 0,
    });
    const result = computeFinance(budget);
    const view = buildPlanViewModel(
      budget,
      result,
      {
        goalName: "",
        targetAmount: 0,
        currentSaved: 0,
        canUseReserve: false,
        priority: "medium",
      },
      { buying: false, saving: false, purchasePrice: 0 },
    );

    expect(view.spendSalary.formatted).toContain("/мес");
    expect(view.spendCard.breakdown).toMatch(/подуш|−/);
  });
});
