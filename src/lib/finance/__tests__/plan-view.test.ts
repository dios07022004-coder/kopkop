import { describe, it, expect } from "vitest";
import { buildPlanViewModel, diffPlanSnapshots } from "@/lib/finance/plan-view";
import { computeFinance, parseBudgetInput } from "@/lib/finance";

describe("buildPlanViewModel", () => {
  it("returns three spend limits with explanations", () => {
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
      { goalName: "", targetAmount: 0, currentSaved: 0, canUseReserve: false, priority: "medium" },
      { buying: false, saving: false, purchasePrice: 0 },
    );

    expect(view.spendMonth.formatted).toMatch(/₽/);
    expect(view.spendSalary.explain.length).toBeGreaterThan(10);
    expect(view.spendCard.nextStep.length).toBeGreaterThan(5);
    expect(view.budget.label).toBeTruthy();
  });

  it("warns when mandatory exceeds income", () => {
    const budget = parseBudgetInput({
      incomeMonthly: 50_000,
      mandatoryMonthly: 60_000,
      currentBalance: 10_000,
      minimumBalance: 5_000,
      plannedVariableMonthly: 0,
      savingsMonthly: 0,
    });
    const result = computeFinance(budget);
    const view = buildPlanViewModel(
      budget,
      result,
      { goalName: "", targetAmount: 0, currentSaved: 0, canUseReserve: false, priority: "medium" },
      { buying: false, saving: false, purchasePrice: 0 },
    );
    expect(view.warnings.some((w) => w.includes("Обязательные"))).toBe(true);
  });

  it("includes purchase ifBuyNow for build_reserve", () => {
    const budget = parseBudgetInput({
      incomeMonthly: 80_000,
      mandatoryMonthly: 40_000,
      savingsMonthly: 10_000,
      currentBalance: 45_000,
      minimumBalance: 30_000,
      plannedVariableMonthly: 0,
    });
    const purchase = { price: 35_000, urgency: 3, usefulness: 4 };
    const result = computeFinance(budget, purchase);
    const view = buildPlanViewModel(
      budget,
      result,
      { goalName: "", targetAmount: 0, currentSaved: 0, canUseReserve: false, priority: "medium" },
      { buying: true, saving: false, purchasePrice: 35_000 },
    );
    expect(view.purchase.active).toBe(true);
    expect(view.purchase.ifBuyNow).toContain("подуш");
    expect(view.purchase.accumulation).not.toBeNull();
  });

  it("includes purchase accumulation for defer scenario", () => {
    const budget = parseBudgetInput({
      incomeMonthly: 120_000,
      mandatoryMonthly: 40_000,
      savingsMonthly: 0,
      currentBalance: 20_000,
      minimumBalance: 15_000,
      plannedVariableMonthly: 0,
    });
    const purchase = { price: 40_000, urgency: 3, usefulness: 4 };
    const result = computeFinance(budget, purchase);
    const view = buildPlanViewModel(
      budget,
      result,
      { goalName: "", targetAmount: 0, currentSaved: 0, canUseReserve: false, priority: "medium" },
      { buying: true, saving: false, purchasePrice: 40_000 },
    );

    expect(view.spendMonth.formatted).toContain("85");
    expect(view.spendSalary.formatted).toContain("80");
    expect(view.spendCard.formatted).toContain("0");
    expect(view.purchase.accumulation?.toSave).toContain("40");
    expect(view.purchase.accumulation?.timeline).toContain("месяц");
    expect(view.purchase.accumulation?.lifeImpact).toContain("40");
    expect(view.budget.mood).not.toBe("calm");
  });
});

describe("diffPlanSnapshots", () => {
  it("detects changed values", () => {
    const before = {
      spendMonth: { formatted: "10 000 ₽", explain: "", nextStep: "" },
      spendSalary: { formatted: "5 000 ₽/мес", explain: "", nextStep: "" },
      spendCard: { formatted: "0 ₽", explain: "", nextStep: "" },
      purchase: { active: false, verdict: "—", shortRule: null, explain: "", ifBuyNow: null, nextStep: "", tone: "muted" as const, accumulation: null },
      goal: { active: false, name: "", remaining: "—", monthlyNeeded: "—", monthsToGoal: "—", monthlyActual: "—", fitsFlow: true, explain: "", nextStep: "", statusLabel: "—", tone: "muted" as const, accumulation: null },
      budget: { mood: "calm" as const, label: "Спокойно", explain: "", nextStep: "" },
    };
    const after = {
      ...before,
      spendMonth: { ...before.spendMonth, formatted: "15 000 ₽" },
    };
    const diff = diffPlanSnapshots(before, after);
    expect(diff.some((d) => d.label === "На жизнь")).toBe(true);
  });
});
