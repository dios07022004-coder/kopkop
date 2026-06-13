import { describe, expect, it } from "vitest";
import { computeBudgetCore } from "../core";
import { normalizeBudgetInput } from "../normalize";

describe("computeBudgetCore — user scenario", () => {
  it("100k income + 100k balance: life 125k, monthly flow 40k, purchase 32k ok", () => {
    const input = normalizeBudgetInput({
      incomeMonthly: 100_000,
      currentBalance: 100_000,
      mandatoryMonthly: 50_000,
      minimumBalance: 15_000,
      plannedVariableMonthly: 0,
      savingsMonthly: 10_000,
    });
    const core = computeBudgetCore(input);

    expect(core.totalResources).toBe(200_000);
    expect(core.freeBudgetMonthly).toBe(40_000);
    expect(core.availableForLife).toBe(125_000);
    expect(core.availableForPurchaseNow).toBe(35_000);
  });
});
