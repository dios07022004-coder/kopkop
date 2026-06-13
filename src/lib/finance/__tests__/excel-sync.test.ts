import { describe, expect, it } from "vitest";
import { computeFinance } from "../index";
import { DEFAULT_BUDGET_INPUT } from "../constants";

describe("excel sync — finance core presets", () => {
  it("default preset matches generate-template DEFAULT_INPUT", () => {
    const result = computeFinance(DEFAULT_BUDGET_INPUT);
    expect(result.core.freeBudgetMonthly).toBe(15_000);
    expect(result.core.availableForLife).toBe(45_000);
    expect(result.core.availableForPurchaseNow).toBe(0);
  });

  it("car scenario preset", () => {
    const result = computeFinance({
      incomeMonthly: 120_000,
      currentBalance: 45_000,
      mandatoryMonthly: 50_000,
      minimumBalance: 20_000,
      plannedVariableMonthly: 0,
      savingsMonthly: 0,
    });
    expect(result.core.freeBudgetMonthly).toBe(70_000);
    expect(result.core.availableForLife).toBe(95_000);
    expect(result.core.availableForPurchaseNow).toBe(0);
  });

  it("student preset", () => {
    const result = computeFinance({
      incomeMonthly: 25_000,
      currentBalance: 10_000,
      mandatoryMonthly: 18_000,
      minimumBalance: 5_000,
      plannedVariableMonthly: 0,
      savingsMonthly: 2_000,
    });
    expect(result.core.freeBudgetMonthly).toBe(5_000);
    expect(result.core.availableForLife).toBeGreaterThan(0);
  });
});
