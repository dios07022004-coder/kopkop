"use client";

import { useCallback, useEffect, useState } from "react";
import type { CalculatorPreset } from "@/data/calculator-presets";
import {
  DEFAULT_BUDGET_INPUT,
  DEFAULT_PURCHASE_INPUT,
  DEFAULT_SAVINGS_GOAL_INPUT,
  parseBudgetInput,
  parsePurchaseInput,
  normalizeSavingsGoalInput,
  type BudgetInput,
  type PurchaseInput,
  type SavingsGoalInput,
} from "@/lib/finance";

const STORAGE_KEY = "dpc-app-v2";

export type ViewMode = "simple" | "detailed";

export interface PlanUiFlags {
  saving: boolean;
  buying: boolean;
  plannedSpending: boolean;
  viewMode: ViewMode;
}

export interface DemoFormState {
  budget: BudgetInput;
  purchase: PurchaseInput;
  savingsGoal: SavingsGoalInput;
  ui: PlanUiFlags;
  activePresetId?: string;
}

export function inferUiFlags(state: {
  budget: BudgetInput;
  purchase: PurchaseInput;
  savingsGoal: SavingsGoalInput;
}): Omit<PlanUiFlags, "viewMode"> {
  return {
    saving:
      state.budget.savingsMonthly > 0 || state.savingsGoal.targetAmount > 0,
    buying: state.purchase.price > 0,
    plannedSpending: state.budget.plannedVariableMonthly > 0,
  };
}

function defaultUi(
  base: Parameters<typeof inferUiFlags>[0],
  patch?: Partial<PlanUiFlags>,
): PlanUiFlags {
  return {
    ...inferUiFlags(base),
    viewMode: "simple",
    ...patch,
  };
}

function loadStoredState(): DemoFormState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<DemoFormState> & {
      ui?: Partial<PlanUiFlags>;
    };
    if (!data.budget) return null;
    const budget = parseBudgetInput({ ...DEFAULT_BUDGET_INPUT, ...data.budget });
    const savingsGoal = normalizeSavingsGoalInput({
      ...DEFAULT_SAVINGS_GOAL_INPUT,
      ...data.savingsGoal,
    });
    const synced = syncGoalContribution(budget, savingsGoal);
    const base = {
      budget,
      purchase: parsePurchaseInput({ ...DEFAULT_PURCHASE_INPUT, ...data.purchase }),
      savingsGoal: synced,
    };
    return {
      ...base,
      ui: defaultUi(base, data.ui),
      activePresetId: data.activePresetId,
    };
  } catch {
    return null;
  }
}

function buildDefaultState(): DemoFormState {
  const budget = parseBudgetInput({
    ...DEFAULT_BUDGET_INPUT,
    plannedVariableMonthly: 0,
    savingsMonthly: 0,
    mandatoryExpenses: [
      {
        id: "mandatory-total",
        label: "Обязательные траты",
        amount: DEFAULT_BUDGET_INPUT.mandatoryMonthly,
      },
    ],
  });
  const base = {
    budget,
    purchase: parsePurchaseInput({ ...DEFAULT_PURCHASE_INPUT, price: 0 }),
    savingsGoal: syncGoalContribution(
      budget,
      normalizeSavingsGoalInput(DEFAULT_SAVINGS_GOAL_INPUT),
    ),
  };
  return { ...base, ui: defaultUi(base) };
}

function syncGoalContribution(
  budget: BudgetInput,
  goal: SavingsGoalInput,
): SavingsGoalInput {
  const amount = budget.savingsMonthly;
  return normalizeSavingsGoalInput({
    ...goal,
    monthlyContribution: amount > 0 ? amount : undefined,
  });
}

export function applyUiFlagsForCompute(state: DemoFormState): {
  budget: BudgetInput;
  purchase: PurchaseInput;
  savingsGoal: SavingsGoalInput;
} {
  let { budget, purchase, savingsGoal } = state;
  const { ui } = state;

  if (!ui.plannedSpending) {
    budget = { ...budget, plannedVariableMonthly: 0 };
  }
  if (!ui.saving) {
    budget = { ...budget, savingsMonthly: 0 };
    savingsGoal = {
      ...savingsGoal,
      targetAmount: 0,
      monthlyContribution: undefined,
    };
  }
  if (!ui.buying) {
    purchase = { ...purchase, price: 0 };
  }

  return { budget, purchase, savingsGoal };
}

export function useDemoStorage() {
  const [state, setState] = useState<DemoFormState>(buildDefaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadStoredState();
    if (stored) setState(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const setBudget = useCallback((budget: BudgetInput) => {
    setState((prev) => {
      const parsed = parseBudgetInput(budget);
      const savingsChanged = parsed.savingsMonthly !== prev.budget.savingsMonthly;
      const savingsGoal = savingsChanged
        ? syncGoalContribution(parsed, prev.savingsGoal)
        : prev.savingsGoal;
      const next = { ...prev, budget: parsed, savingsGoal, activePresetId: undefined };
      return {
        ...next,
        ui: {
          ...prev.ui,
          saving:
            prev.ui.saving ||
            parsed.savingsMonthly > 0 ||
            savingsGoal.targetAmount > 0,
          plannedSpending:
            prev.ui.plannedSpending || parsed.plannedVariableMonthly > 0,
        },
      };
    });
  }, []);

  const setPurchase = useCallback((purchase: PurchaseInput) => {
    setState((prev) => {
      const parsed = parsePurchaseInput(purchase);
      return {
        ...prev,
        purchase: parsed,
        activePresetId: undefined,
        ui: {
          ...prev.ui,
          buying: prev.ui.buying || parsed.price > 0,
        },
      };
    });
  }, []);

  const setSavingsGoal = useCallback((savingsGoal: SavingsGoalInput) => {
    setState((prev) => {
      const parsed = normalizeSavingsGoalInput(savingsGoal);
      return {
        ...prev,
        savingsGoal: parsed,
        activePresetId: undefined,
        ui: {
          ...prev.ui,
          saving: prev.ui.saving || parsed.targetAmount > 0,
        },
      };
    });
  }, []);

  const setUiFlags = useCallback((patch: Partial<PlanUiFlags>) => {
    setState((prev) => ({
      ...prev,
      ui: { ...prev.ui, ...patch },
    }));
  }, []);

  const applySnapshot = useCallback(
    (snap: {
      budget: BudgetInput;
      purchase: PurchaseInput;
      savingsGoal: SavingsGoalInput;
    }) => {
      setState(() => {
        const budget = parseBudgetInput(snap.budget);
        const purchase = parsePurchaseInput(snap.purchase);
        const savingsGoal = normalizeSavingsGoalInput(snap.savingsGoal);
        const base = { budget, purchase, savingsGoal };
        return { ...base, activePresetId: undefined, ui: defaultUi(base) };
      });
    },
    [],
  );

  const applyPreset = useCallback((preset: CalculatorPreset) => {
    setState(() => {
      const budget = parseBudgetInput({
        ...DEFAULT_BUDGET_INPUT,
        ...preset.budget,
        mandatoryExpenses: [
          {
            id: "mandatory-total",
            label: "Обязательные траты",
            amount: preset.budget.mandatoryMonthly,
          },
        ],
      });
      const savingsGoal = syncGoalContribution(
        budget,
        normalizeSavingsGoalInput({
          ...DEFAULT_SAVINGS_GOAL_INPUT,
          ...preset.savingsGoal,
        }),
      );
      const purchase = parsePurchaseInput({
        ...DEFAULT_PURCHASE_INPUT,
        ...preset.purchase,
        price: preset.purchase?.price ?? 0,
      });
      const base = { budget, purchase, savingsGoal };
      return {
        ...base,
        activePresetId: preset.id,
        ui: defaultUi(base, preset.ui),
      };
    });
  }, []);

  return {
    ...state,
    hydrated,
    setBudget,
    setPurchase,
    setSavingsGoal,
    setUiFlags,
    applyPreset,
    applySnapshot,
  };
}
