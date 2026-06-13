import { describe, it, expect } from "vitest";
import {
  buildHowCalculatedLines,
  buildVerifyCalculationView,
} from "@/lib/finance/verify-calculation";
import { buildPlanViewModel } from "@/lib/finance/plan-view";
import { computeFinance, parseBudgetInput } from "@/lib/finance";

const scenarioBudget = () =>
  parseBudgetInput({
    incomeMonthly: 140_000,
    mandatoryMonthly: 60_000,
    currentBalance: 15_000,
    minimumBalance: 10_000,
    plannedVariableMonthly: 0,
    savingsMonthly: 0,
  });

describe("buildVerifyCalculationView", () => {
  it("shows chain and three detailed formulas for 15k/140k/60k/10k", () => {
    const budget = scenarioBudget();
    const result = computeFinance(budget);
    const view = buildVerifyCalculationView(budget, result);

    expect(view.chainSteps.some((s) => s.label.includes("На счёте"))).toBe(
      true,
    );
    expect(view.chainCheck).toContain("85");
    expect(view.formulas).toHaveLength(3);

    const card = view.formulas.find((f) => f.id === "card")!;
    expect(card.formula).toContain("MAX(0,");
    expect(card.formula).toContain("= 0");

    const month = view.formulas.find((f) => f.id === "month")!;
    expect(month.formula).toContain("15");
    expect(month.formula).toContain("140");
    expect(month.formula).toContain("85");

    const salary = view.formulas.find((f) => f.id === "salary")!;
    expect(salary.formula).toContain("80");
    expect(salary.note).toContain("85");
  });

  it("explains why month limit differs from card spend", () => {
    const budget = scenarioBudget();
    const result = computeFinance(budget);
    const view = buildVerifyCalculationView(budget, result);

    expect(view.threeNumbersNote).toContain("5");
    expect(view.threeNumbersNote).toContain("0");
  });
});

describe("buildHowCalculatedLines", () => {
  it("returns compact formula strings", () => {
    const budget = scenarioBudget();
    const result = computeFinance(budget);
    const lines = buildHowCalculatedLines(budget, result);
    expect(lines).toHaveLength(3);
    expect(lines[2]).toContain("MAX(0,");
  });
});

describe("why chain includes balance", () => {
  it("sums correctly to availableForLife", () => {
    const budget = scenarioBudget();
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
    expect(view.whyChain.some((s) => s.label.includes("На счёте"))).toBe(true);
    expect(view.spendMonth.formatted).toContain("85");
    expect(view.spendCard.breakdown).toContain("15");
  });
});
