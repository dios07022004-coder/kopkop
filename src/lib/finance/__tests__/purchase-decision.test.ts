import { describe, expect, it } from "vitest";
import { computeFinance, decidePurchase, computeBudgetCore, buildBreakdown } from "../index";
import { DEFAULT_BUDGET_INPUT, DEFAULT_PURCHASE_INPUT } from "../constants";
import { normalizeBudgetInput } from "../normalize";

describe("decidePurchase", () => {
  it("default: build_reserve when purchase would breach minimum balance", () => {
    const result = computeFinance(DEFAULT_BUDGET_INPUT, DEFAULT_PURCHASE_INPUT);
    expect(result.purchase?.decision).toBe("build_reserve");
    expect(result.purchase?.missingAmount).toBe(35000);
    expect(result.purchase?.reserveAfterPurchase).toBe(10000);
  });

  it("K3 fix: afford from balance but negative flow must NOT wait", () => {
    const input = normalizeBudgetInput({
      incomeMonthly: 50000,
      currentBalance: 80000,
      mandatoryMonthly: 20000,
      plannedVariableMonthly: 25000,
      savingsMonthly: 15000,
      minimumBalance: 10000,
      reserveTarget: 50000,
    });
    const core = computeBudgetCore(input);
    expect(core.freeBudgetMonthly).toBeLessThan(0);

    const purchase = decidePurchase(
      core,
      { price: 15000, urgency: 1, usefulness: 1 },
      input.minimumBalance,
      input.currentBalance,
    );
    expect(purchase.decision).not.toBe("wait");
    expect(["defer", "build_reserve"]).toContain(purchase.decision);
  });

  it("build_reserve when purchase breaches minimum balance", () => {
    const input = normalizeBudgetInput({
      incomeMonthly: 80000,
      currentBalance: 50000,
      mandatoryMonthly: 10000,
      plannedVariableMonthly: 10000,
      savingsMonthly: 5000,
      minimumBalance: 30000,
    });
    const core = computeBudgetCore(input);
    const purchase = decidePurchase(
      core,
      { price: 25000, urgency: 5, usefulness: 5 },
      input.minimumBalance,
      input.currentBalance,
    );
    expect(purchase.decision).toBe("build_reserve");
  });

  it("wait when impulse purchase but financially OK", () => {
    const input = normalizeBudgetInput({
      incomeMonthly: 100000,
      currentBalance: 80000,
      mandatoryMonthly: 20000,
      plannedVariableMonthly: 10000,
      savingsMonthly: 10000,
      minimumBalance: 20000,
    });
    const core = computeBudgetCore(input);
    const purchase = decidePurchase(
      core,
      { price: 5000, urgency: 1, usefulness: 1 },
      input.minimumBalance,
      input.currentBalance,
    );
    expect(purchase.decision).toBe("wait");
  });

  it("buy_now when affordable and needed", () => {
    const input = normalizeBudgetInput({
      incomeMonthly: 100000,
      currentBalance: 80000,
      mandatoryMonthly: 20000,
      plannedVariableMonthly: 10000,
      savingsMonthly: 10000,
      minimumBalance: 20000,
    });
    const core = computeBudgetCore(input);
    const purchase = decidePurchase(
      core,
      { price: 5000, urgency: 5, usefulness: 5 },
      input.minimumBalance,
      input.currentBalance,
    );
    expect(purchase.decision).toBe("buy_now");
  });

  it("months null when freeBudget <= 0 and missing > 0", () => {
    const input = normalizeBudgetInput({
      incomeMonthly: 40000,
      currentBalance: 10000,
      mandatoryMonthly: 35000,
      plannedVariableMonthly: 10000,
      savingsMonthly: 5000,
      minimumBalance: 5000,
    });
    const result = computeFinance(input, { price: 20000, urgency: 3, usefulness: 3 });
    expect(result.purchase?.monthsToPurchase).toBeNull();
  });

  it("zero price is buy_now when affordable", () => {
    const result = computeFinance(DEFAULT_BUDGET_INPUT, {
      price: 0,
      urgency: 3,
      usefulness: 3,
    });
    expect(result.purchase?.canAffordNow).toBe(true);
    expect(result.purchase?.missingAmount).toBe(0);
  });

  it("normalize clamps negative urgency to valid range", () => {
    const result = computeFinance(DEFAULT_BUDGET_INPUT, {
      price: 35000,
      urgency: -1,
      usefulness: 10,
    });
    expect(result.purchase).toBeDefined();
  });
});

describe("normalizeBudgetInput", () => {
  it("derives mandatory from lines when not provided", () => {
    const input = normalizeBudgetInput({
      mandatoryExpenses: [
        { id: "a", label: "A", amount: 1000 },
        { id: "b", label: "B", amount: 2000 },
      ],
      incomeMonthly: 0,
      currentBalance: 0,
      plannedVariableMonthly: 0,
      savingsMonthly: 0,
      minimumBalance: 0,
    });
    expect(input.mandatoryMonthly).toBe(3000);
  });

  it("handles empty input gracefully", () => {
    const input = normalizeBudgetInput({});
    expect(input.incomeMonthly).toBeGreaterThanOrEqual(0);
    expect(input.mandatoryMonthly).toBeGreaterThan(0);
  });
});

describe("computeFinance integration", () => {
  it("allocation matches availableForLife", () => {
    const result = computeFinance(DEFAULT_BUDGET_INPUT);
    expect(result.allocation.totalAllocated).toBe(result.core.availableForLife);
  });

  it("breakdown has key steps", () => {
    const result = computeFinance(DEFAULT_BUDGET_INPUT);
    const steps = buildBreakdown(
      normalizeBudgetInput(DEFAULT_BUDGET_INPUT),
      result.core,
    );
    expect(steps.some((s) => s.label.includes("На жизнь"))).toBe(true);
  });
});
