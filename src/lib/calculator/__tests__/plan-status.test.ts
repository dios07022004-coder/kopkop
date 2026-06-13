import { describe, it, expect } from "vitest";
import {
  getPlanStatusMessage,
  getHeroSubtitle,
  buildHowCalculatedLines,
  buildPlanActionRows,
} from "@/lib/calculator/plan-status";
import {
  CALCULATOR_HERO,
  CALCULATOR_PLAN,
  CALCULATOR_STATUS,
  CALCULATOR_PAGE,
} from "@/data/calculator-copy";
import {
  computeFinance,
  DEFAULT_SAVINGS_GOAL_INPUT,
  parseBudgetInput,
} from "@/lib/finance";

const carBudget = parseBudgetInput({
  incomeMonthly: 120_000,
  currentBalance: 45_000,
  mandatoryMonthly: 50_000,
  minimumBalance: 20_000,
  plannedVariableMonthly: 0,
  savingsMonthly: 0,
});

const carGoal = {
  goalName: "Машина",
  targetAmount: 1_000_000,
  currentSaved: 120_000,
  deadlineMonths: 9,
  monthlyContribution: 70_000,
  canUseReserve: true,
  priority: "medium" as const,
};

describe("calculator-copy", () => {
  it("exports page title", () => {
    expect(CALCULATOR_PAGE.title).toBe("Калькулятор бюджета");
    expect(CALCULATOR_PLAN.title).toBe("Подробный план");
    expect(CALCULATOR_HERO.label).toContain("зарплат");
  });
});

describe("plan-status", () => {
  it("shows flow danger when income does not cover expenses", () => {
    const budget = parseBudgetInput({
      ...carBudget,
      incomeMonthly: 40_000,
      mandatoryMonthly: 50_000,
      plannedVariableMonthly: 0,
    });
    const result = computeFinance(budget, undefined, DEFAULT_SAVINGS_GOAL_INPUT);
    expect(getPlanStatusMessage(budget, result, DEFAULT_SAVINGS_GOAL_INPUT)).toBe(
      CALCULATOR_STATUS.flowDanger,
    );
  });

  it("shows reserve warning when balance below minimum", () => {
    const budget = parseBudgetInput({
      ...carBudget,
      currentBalance: 10_000,
      minimumBalance: 25_000,
    });
    const result = computeFinance(budget, undefined, DEFAULT_SAVINGS_GOAL_INPUT);
    const msg = getPlanStatusMessage(budget, result, DEFAULT_SAVINGS_GOAL_INPUT);
    expect(msg).toContain("подушки");
  });

  it("shows all-income-to-goal when goal consumes free budget", () => {
    const budget = parseBudgetInput({ ...carBudget, savingsMonthly: 70_000 });
    const result = computeFinance(budget, undefined, carGoal);
    expect(result.core.freeBudgetMonthly).toBe(0);
    const msg = getPlanStatusMessage(budget, result, carGoal);
    expect(msg).not.toBeNull();
    expect(msg!).toContain("Машина");
  });

  it("hero subtitle mentions goal when active", () => {
    const budget = parseBudgetInput({
      ...carBudget,
      savingsMonthly: 30_000,
    });
    const goal = {
      ...DEFAULT_SAVINGS_GOAL_INPUT,
      targetAmount: 500_000,
      monthlyContribution: 30_000,
      goalName: "Отпуск",
    };
    const result = computeFinance(budget, undefined, goal);
    const subtitle = getHeroSubtitle(result, goal);
    expect(subtitle).toContain("Отпуск");
  });

  it("how-calculated lines include computed free budget", () => {
    const budget = parseBudgetInput({
      ...carBudget,
      incomeMonthly: 120_000,
      mandatoryMonthly: 60_000,
      savingsMonthly: 20_000,
      plannedVariableMonthly: 0,
    });
    const result = computeFinance(budget, undefined, DEFAULT_SAVINGS_GOAL_INPUT);
    const lines = buildHowCalculatedLines(budget, result);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain(
      result.core.freeBudgetMonthly.toLocaleString("ru-RU"),
    );
    expect(result.core.freeBudgetMonthly).toBe(40_000);
  });
});

describe("buildPlanActionRows", () => {
  it("always includes spend and card rows", () => {
    const result = computeFinance(carBudget, undefined, DEFAULT_SAVINGS_GOAL_INPUT);
    const rows = buildPlanActionRows(result, {
      goalName: "",
      purchasePrice: 0,
      savingsMonthly: 0,
      flags: { saving: false, buying: false, plannedSpending: false, viewMode: "simple" },
    });
    expect(rows.some((r) => r.id === "spend-salary")).toBe(true);
    expect(rows.some((r) => r.id === "spend-total")).toBe(true);
    expect(rows.some((r) => r.id === "from-card")).toBe(true);
    expect(rows.some((r) => r.id === "save-goal")).toBe(false);
  });

  it("shows goal and defer rows when toggles on", () => {
    const budget = parseBudgetInput({ ...carBudget, savingsMonthly: 70_000 });
    const purchase = { price: 35_000, urgency: 3, usefulness: 4 };
    const result = computeFinance(budget, purchase, carGoal);
    const rows = buildPlanActionRows(result, {
      goalName: "Машина",
      purchasePrice: 35_000,
      savingsMonthly: 70_000,
      flags: { saving: true, buying: true, plannedSpending: false, viewMode: "simple" },
    });
    expect(rows.some((r) => r.id === "save-goal")).toBe(true);
    expect(rows.some((r) => r.id === "purchase-decision")).toBe(true);
  });
});

describe("purchase defer copy", () => {
  it("separates life vs purchase saving in nextStep", () => {
    const budget = parseBudgetInput({
      incomeMonthly: 100_000,
      mandatoryMonthly: 50_000,
      savingsMonthly: 20_000,
      currentBalance: 0,
      minimumBalance: 25_000,
      plannedVariableMonthly: 0,
    });
    const purchase = { price: 40_000, urgency: 3, usefulness: 4 };
    const result = computeFinance(budget, purchase, DEFAULT_SAVINGS_GOAL_INPUT);
    expect(result.purchase?.decision).toBe("defer");
    expect(result.purchase?.nextStep).toContain("Вариант А");
    expect(result.purchase?.nextStep).toMatch(/на жизнь из зарплаты останется/);
    expect(result.purchase?.nextStep).toContain("Вариант Б");
  });
});
