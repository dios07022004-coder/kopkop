import { describe, expect, it } from "vitest";
import { computeBudgetCore, computeReserveProgress } from "../core";
import { computeFinance } from "../index";
import { computeSavingsGoal, normalizeSavingsGoalInput } from "../savings-goal";
import { normalizeBudgetInput } from "../normalize";

const baseBudget = {
  incomeMonthly: 100_000,
  currentBalance: 25_000,
  mandatoryMonthly: 50_000,
  minimumBalance: 15_000,
  plannedVariableMonthly: 0,
  savingsMonthly: 10_000,
};

describe("reserve progress fix", () => {
  it("uses minimumBalance when reserveTarget not set", () => {
    const progress = computeReserveProgress(25_000, 15_000);
    expect(progress).toBe(100);
  });

  it("user scenario: flow healthy, reserve caution after mandatory", () => {
    const core = computeBudgetCore(normalizeBudgetInput(baseBudget));
    expect(core.freeBudgetMonthly).toBe(40_000);
    expect(core.flowSafetyStatus).toBe("healthy");
    expect(core.reserveSafetyStatus).toBe("caution");
    expect(core.availableForLife).toBe(50_000);
  });
});

describe("computeSavingsGoal", () => {
  it("scenario 1: laptop 60k, 15k saved, 4 months", () => {
    const input = normalizeBudgetInput(baseBudget);
    const core = computeBudgetCore(input);
    const goal = computeSavingsGoal(
      core,
      input,
      normalizeSavingsGoalInput({
        goalName: "Ноутбук",
        targetAmount: 60_000,
        currentSaved: 15_000,
        deadlineMonths: 4,
        canUseReserve: false,
        priority: "medium",
      }),
    );
    expect(goal.remainingToSave).toBe(45_000);
    expect(goal.requiredMonthly).toBe(11_250);
    expect(goal.status).toBe("ok");
  });

  it("scenario 2: 100k goal, contribution from free budget", () => {
    const input = normalizeBudgetInput(baseBudget);
    const core = computeBudgetCore(input);
    const goal = computeSavingsGoal(
      core,
      input,
      normalizeSavingsGoalInput({
        goalName: "Отпуск",
        targetAmount: 100_000,
        currentSaved: 0,
        monthlyContribution: 20_000,
        canUseReserve: false,
        priority: "medium",
      }),
    );
    expect(goal.monthsToGoal).toBe(5);
    expect(goal.status).toBe("ok");
  });

  it("achieved when currentSaved >= target", () => {
    const input = normalizeBudgetInput(baseBudget);
    const core = computeBudgetCore(input);
    const goal = computeSavingsGoal(
      core,
      input,
      normalizeSavingsGoalInput({
        targetAmount: 10_000,
        currentSaved: 12_000,
        canUseReserve: false,
        priority: "medium",
      }),
    );
    expect(goal.status).toBe("achieved");
    expect(goal.remainingToSave).toBe(0);
  });

  it("impossible when freeBudget <= 0", () => {
    const input = normalizeBudgetInput({
      ...baseBudget,
      incomeMonthly: 40_000,
      mandatoryMonthly: 50_000,
      savingsMonthly: 0,
    });
    const core = computeBudgetCore(input);
    const goal = computeSavingsGoal(
      core,
      input,
      normalizeSavingsGoalInput({
        targetAmount: 50_000,
        currentSaved: 0,
        deadlineMonths: 6,
        canUseReserve: false,
        priority: "medium",
      }),
    );
    expect(goal.status).toBe("impossible");
  });

  it("warning when contribution exceeds free budget", () => {
    const input = normalizeBudgetInput(baseBudget);
    const core = computeBudgetCore(input);
    const goal = computeSavingsGoal(
      core,
      input,
      normalizeSavingsGoalInput({
        targetAmount: 200_000,
        currentSaved: 0,
        monthlyContribution: 50_000,
        canUseReserve: false,
        priority: "medium",
      }),
    );
    expect(goal.status).toBe("warning");
  });

  it("risk when canUseReserve draw breaches minimum", () => {
    const input = normalizeBudgetInput({
      ...baseBudget,
      currentBalance: 20_000,
      minimumBalance: 15_000,
    });
    const core = computeBudgetCore(input);
    const goal = computeSavingsGoal(
      core,
      input,
      normalizeSavingsGoalInput({
        targetAmount: 50_000,
        currentSaved: 0,
        monthlyContribution: 50_000,
        canUseReserve: true,
        priority: "medium",
      }),
    );
    expect(goal.status).toBe("risk");
  });

  it("income contribution with canUseReserve is not false risk", () => {
    const input = normalizeBudgetInput({
      ...baseBudget,
      currentBalance: 45_000,
      minimumBalance: 20_000,
      incomeMonthly: 120_000,
      mandatoryMonthly: 50_000,
      savingsMonthly: 0,
    });
    const core = computeBudgetCore(input);
    const goal = computeSavingsGoal(
      core,
      input,
      normalizeSavingsGoalInput({
        targetAmount: 1_000_000,
        currentSaved: 120_000,
        deadlineMonths: 9,
        monthlyContribution: 70_000,
        canUseReserve: true,
        priority: "medium",
      }),
    );
    expect(goal.status).toBe("warning");
    expect(goal.monthsToGoal).toBe(13);
  });

  it("risk when balance below minimum only if contribution needs reserve draw", () => {
    const input = normalizeBudgetInput({
      ...baseBudget,
      currentBalance: 10_000,
      minimumBalance: 15_000,
    });
    const core = computeBudgetCore(input);
    const goal = computeSavingsGoal(
      core,
      input,
      normalizeSavingsGoalInput({
        targetAmount: 30_000,
        currentSaved: 0,
        monthlyContribution: 5_000,
        canUseReserve: false,
        priority: "medium",
      }),
      { freeBudgetBeforeGoal: core.freeBudgetMonthly, freeAfterGoal: 35_000 },
    );
    expect(goal.status).toBe("ok");
    expect(goal.reserveNote).toBeDefined();
  });

  it("laptop 1M: 50k/mo from income, ahead of 50mo deadline, tight budget", () => {
    const input = normalizeBudgetInput({
      incomeMonthly: 100_000,
      currentBalance: 10_000,
      mandatoryMonthly: 50_000,
      minimumBalance: 30_000,
      plannedVariableMonthly: 0,
      savingsMonthly: 0,
    });
    const baseCore = computeBudgetCore(input);
    const linkedCore = computeBudgetCore({ ...input, savingsMonthly: 50_000 });
    const goal = computeSavingsGoal(
      baseCore,
      input,
      normalizeSavingsGoalInput({
        goalName: "Ноутбук",
        targetAmount: 1_000_000,
        currentSaved: 200_000,
        deadlineMonths: 50,
        monthlyContribution: 50_000,
        canUseReserve: true,
        priority: "medium",
      }),
      {
        freeBudgetBeforeGoal: baseCore.freeBudgetMonthly,
        freeAfterGoal: linkedCore.freeBudgetMonthly,
      },
    );
    expect(goal.remainingToSave).toBe(800_000);
    expect(goal.monthsToGoal).toBe(16);
    expect(goal.requiredMonthly).toBe(16_000);
    expect(goal.status).toBe("warning");
    expect(goal.statusLabel).toBe("Успеваете, но впритык");
    expect(goal.reserveNote).toBeDefined();
    expect(goal.summary).toContain("16");
  });

  it("targetAmount zero → impossible", () => {
    const input = normalizeBudgetInput(baseBudget);
    const core = computeBudgetCore(input);
    const goal = computeSavingsGoal(
      core,
      input,
      normalizeSavingsGoalInput({
        targetAmount: 0,
        currentSaved: 0,
        canUseReserve: false,
        priority: "medium",
      }),
    );
    expect(goal.status).toBe("impossible");
  });

  it("currentSaved > target → achieved, remaining 0", () => {
    const input = normalizeBudgetInput(baseBudget);
    const core = computeBudgetCore(input);
    const goal = computeSavingsGoal(
      core,
      input,
      normalizeSavingsGoalInput({
        targetAmount: 5_000,
        currentSaved: 8_000,
        canUseReserve: false,
        priority: "medium",
      }),
    );
    expect(goal.remainingToSave).toBe(0);
    expect(goal.progressPercent).toBe(100);
  });

  it("deadline zero ignored, uses contribution", () => {
    const input = normalizeBudgetInput(baseBudget);
    const core = computeBudgetCore(input);
    const goal = computeSavingsGoal(
      core,
      input,
      normalizeSavingsGoalInput({
        targetAmount: 40_000,
        currentSaved: 0,
        deadlineMonths: 0,
        monthlyContribution: 10_000,
        canUseReserve: false,
        priority: "medium",
      }),
    );
    expect(goal.requiredMonthly).toBeNull();
    expect(goal.monthsToGoal).toBe(4);
  });

  it("progress percent rounds to 1 decimal", () => {
    const input = normalizeBudgetInput(baseBudget);
    const core = computeBudgetCore(input);
    const goal = computeSavingsGoal(
      core,
      input,
      normalizeSavingsGoalInput({
        targetAmount: 60_000,
        currentSaved: 15_000,
        canUseReserve: false,
        priority: "medium",
      }),
    );
    expect(goal.progressPercent).toBe(25);
  });

  it("computeFinance includes savingsGoal", () => {
    const result = computeFinance(
      baseBudget,
      undefined,
      { targetAmount: 60_000, currentSaved: 15_000, deadlineMonths: 4 },
    );
    expect(result.savingsGoal?.requiredMonthly).toBe(11_250);
  });

  it("safeContribution equals freeBudgetMonthly", () => {
    const result = computeFinance(baseBudget, undefined, {
      targetAmount: 30_000,
      currentSaved: 0,
      deadlineMonths: 3,
    });
    expect(result.savingsGoal?.safeContribution).toBe(40_000);
  });
});
