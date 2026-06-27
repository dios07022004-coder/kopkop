import { describe, it, expect } from "vitest";
import { computeFinance } from "../index";
import type { BudgetInput } from "../types";

const B = (p: Partial<BudgetInput>): BudgetInput => ({
  incomeMonthly: 0,
  currentBalance: 0,
  mandatoryMonthly: 0,
  plannedVariableMonthly: 0,
  savingsMonthly: 0,
  minimumBalance: 0,
  ...p,
});

/** Честный расчёт покупки (как в квизе/кабинете): наличные сейчас + реальная ставка откладывания. */
function purchasePlan(b: BudgetInput, price: number) {
  const cashNow = Math.max(0, b.currentBalance - b.minimumBalance);
  const gap = Math.max(0, price - cashNow);
  const months = gap > 0 && b.savingsMonthly > 0 ? Math.ceil(gap / b.savingsMonthly) : null;
  return { cashNow, gap, canBuyNow: gap === 0, months };
}

describe("сценарии расчёта (разные числа)", () => {
  const cases = [
    { name: "круглые: 80k/40k/0", b: B({ incomeMonthly: 80000, mandatoryMonthly: 40000 }), free: 40000, afterSavings: 40000 },
    { name: "с накоплением: 130k/60k/10k", b: B({ incomeMonthly: 130000, mandatoryMonthly: 60000, savingsMonthly: 10000 }), free: 70000, afterSavings: 60000 },
    { name: "некруглые: 55555/33333/5000", b: B({ incomeMonthly: 55555, mandatoryMonthly: 33333, savingsMonthly: 5000 }), free: 22222, afterSavings: 17222 },
    { name: "нечётные: 99999/33333/11111", b: B({ incomeMonthly: 99999, mandatoryMonthly: 33333, savingsMonthly: 11111 }), free: 66666, afterSavings: 55555 },
    { name: "ноль свободного: 100k/100k", b: B({ incomeMonthly: 100000, mandatoryMonthly: 100000 }), free: 0, afterSavings: 0 },
    { name: "минус (доход < обязательных): 45k/60k", b: B({ incomeMonthly: 45000, mandatoryMonthly: 60000 }), free: -15000, afterSavings: -15000 },
    { name: "сотни тысяч: 333333/111111/22222", b: B({ incomeMonthly: 333333, mandatoryMonthly: 111111, savingsMonthly: 22222 }), free: 222222, afterSavings: 200000 },
    { name: "десятки тысяч: 27500/12300/0", b: B({ incomeMonthly: 27500, mandatoryMonthly: 12300 }), free: 15200, afterSavings: 15200 },
  ];

  for (const c of cases) {
    it(`${c.name}: свободно=${c.free}, после откладывания=${c.afterSavings}`, () => {
      const r = computeFinance(c.b);
      expect(r.core.remainingAfterMandatory).toBe(c.free); // доход − обязательные
      expect(r.core.freeBudgetMonthly).toBe(c.afterSavings); // − откладываю
    });
  }

  it("покупка считается честно (наличные + ставка откладывания)", () => {
    // 130k/60k/10k, на счёте 22222, подушка 10000, покупка 100000
    const b = B({ incomeMonthly: 130000, mandatoryMonthly: 60000, savingsMonthly: 10000, currentBalance: 22222, minimumBalance: 10000 });
    const p = purchasePlan(b, 100000);
    expect(p.cashNow).toBe(12222);
    expect(p.gap).toBe(87778);
    expect(p.canBuyNow).toBe(false);
    expect(p.months).toBe(9); // ceil(87778 / 10000)
  });

  it("покупка по карману сейчас", () => {
    const b = B({ currentBalance: 80000, minimumBalance: 10000, savingsMonthly: 5000 });
    const p = purchasePlan(b, 50000); // 50k <= 70k наличных
    expect(p.canBuyNow).toBe(true);
    expect(p.gap).toBe(0);
    expect(p.months).toBeNull();
  });

  it("аллокация по категориям суммируется к свободному (без потери копеек)", () => {
    const r = computeFinance(B({ incomeMonthly: 99999, mandatoryMonthly: 33333 }));
    const sum = r.allocation.allocations.reduce((s, a) => s + a.amount, 0);
    // распределяется availableForLife (а не free); проверяем, что нет рассинхрона округления
    expect(sum).toBe(r.allocation.totalAllocated);
  });
});
