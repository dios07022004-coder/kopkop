import { describe, it, expect } from "vitest";
import { getPurchaseExplanation } from "@/lib/finance/copy";

describe("getPurchaseExplanation defer", () => {
  it("variant A uses monthly needed, not full free budget", () => {
    const { nextStep } = getPurchaseExplanation("defer", {
      missingAmount: 40_000,
      monthsToPurchase: 1,
      reserveAfterPurchase: -20_000,
      minimumBalance: 15_000,
      freeBudgetMonthly: 80_000,
      availableForPurchaseNow: 0,
      purchasePrice: 40_000,
      savingsMonthly: 0,
    });

    expect(nextStep).toMatch(/40[\s\u202f]?000/);
    expect(nextStep).toMatch(/останется 40[\s\u202f]?000/);
    expect(nextStep).not.toMatch(/откладывать 80[\s\u202f]?000 ₽\/мес — на жизнь из зарплаты не останется/);
  });
});
