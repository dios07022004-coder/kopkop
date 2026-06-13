import { describe, expect, it } from "vitest";
import { computeBudgetCore } from "../core";
import { DEFAULT_BUDGET_INPUT } from "../constants";
import { normalizeBudgetInput } from "../normalize";

describe("computeBudgetCore", () => {
  it("default scenario: availableForLife and freeBudgetMonthly", () => {
    const input = normalizeBudgetInput(DEFAULT_BUDGET_INPUT);
    const core = computeBudgetCore(input);

    expect(core.freeBudgetMonthly).toBe(15000);
    expect(core.availableForLife).toBe(45000);
    expect(core.availableForPurchaseNow).toBe(0);
    expect(core.projectedEndBalance).toBe(input.minimumBalance);
  });

  it("zero income uses balance only for life", () => {
    const core = computeBudgetCore(
      normalizeBudgetInput({
        ...DEFAULT_BUDGET_INPUT,
        incomeMonthly: 0,
        currentBalance: 50000,
        mandatoryMonthly: 10000,
        savingsMonthly: 5000,
        minimumBalance: 20000,
      }),
    );
    expect(core.availableForLife).toBe(15000);
    expect(core.totalResources).toBe(50000);
  });

  it("zero balance and zero income gives danger", () => {
    const core = computeBudgetCore(
      normalizeBudgetInput({
        incomeMonthly: 0,
        currentBalance: 0,
        mandatoryMonthly: 0,
        plannedVariableMonthly: 0,
        savingsMonthly: 0,
        minimumBalance: 0,
      }),
    );
    expect(core.availableForLife).toBe(0);
    expect(core.safetyStatus).toBe("danger");
  });

  it("mandatory exceeds income yields negative freeBudget", () => {
    const core = computeBudgetCore(
      normalizeBudgetInput({
        ...DEFAULT_BUDGET_INPUT,
        incomeMonthly: 30000,
        mandatoryMonthly: 50000,
      }),
    );
    expect(core.freeBudgetMonthly).toBeLessThan(0);
    expect(core.safetyStatus).toBe("danger");
  });

  it("reserve progress uses explicit reserveTarget when set", () => {
    const core = computeBudgetCore(
      normalizeBudgetInput({
        ...DEFAULT_BUDGET_INPUT,
        currentBalance: 200000,
        reserveTarget: 100000,
      }),
    );
    expect(core.reserveProgress).toBe(100);
  });

  it("upcomingMandatoryFromBalance is min of balance and mandatory", () => {
    const core = computeBudgetCore(normalizeBudgetInput(DEFAULT_BUDGET_INPUT));
    expect(core.upcomingMandatoryFromBalance).toBe(
      Math.min(DEFAULT_BUDGET_INPUT.currentBalance, DEFAULT_BUDGET_INPUT.mandatoryMonthly),
    );
  });
});
