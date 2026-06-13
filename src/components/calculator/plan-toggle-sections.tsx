"use client";

import {
  CALCULATOR_INPUTS,
  CALCULATOR_TOGGLES,
} from "@/data/calculator-copy";
import type { PlanUiFlags } from "@/hooks/use-demo-storage";
import type {
  BudgetInput,
  FinanceResult,
  PurchaseInput,
  SavingsGoalInput,
} from "@/lib/finance";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoalSectionContent } from "@/components/calculator/goal-section";
import { PurchaseSectionContent } from "@/components/calculator/purchase-section";
import { cn } from "@/lib/utils";

interface PlanToggleSectionsProps {
  ui: PlanUiFlags;
  budget: BudgetInput;
  purchase: PurchaseInput;
  savingsGoal: SavingsGoalInput;
  result: FinanceResult;
  onUiChange: (patch: Partial<PlanUiFlags>) => void;
  onBudgetChange: (budget: BudgetInput) => void;
  onPurchaseChange: (purchase: PurchaseInput) => void;
  onGoalChange: (goal: SavingsGoalInput) => void;
}

function ToggleBlock({
  id,
  checked,
  onCheckedChange,
  label,
  hint,
  children,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  hint: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="soft-card overflow-hidden">
      <div className="flex items-start gap-3 p-5 sm:p-6">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <Label htmlFor={id} className="cursor-pointer text-base font-semibold">
            {label}
          </Label>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
      {checked && children && (
        <div className={cn("border-t border-border/60 px-5 pb-5 sm:px-6 sm:pb-6")}>
          {children}
        </div>
      )}
    </div>
  );
}

export function PlanToggleSections({
  ui,
  budget,
  purchase,
  savingsGoal,
  result,
  onUiChange,
  onBudgetChange,
  onPurchaseChange,
  onGoalChange,
}: PlanToggleSectionsProps) {
  const handleSavingToggle = (on: boolean) => {
    onUiChange({ saving: on });
    if (on && budget.savingsMonthly === 0 && savingsGoal.targetAmount === 0) {
      onGoalChange({ ...savingsGoal, goalName: savingsGoal.goalName || "Цель" });
    }
  };

  const handleBuyingToggle = (on: boolean) => {
    onUiChange({ buying: on });
    if (!on) {
      onPurchaseChange({ ...purchase, price: 0 });
    }
  };

  const handlePlannedToggle = (on: boolean) => {
    onUiChange({ plannedSpending: on });
    if (!on) {
      onBudgetChange({ ...budget, plannedVariableMonthly: 0 });
    }
  };

  return (
    <div className="space-y-4">
      <ToggleBlock
        id="toggle-saving"
        checked={ui.saving}
        onCheckedChange={handleSavingToggle}
        label={CALCULATOR_TOGGLES.saving.label}
        hint={CALCULATOR_TOGGLES.saving.hint}
      >
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>{CALCULATOR_INPUTS.savingsLabel}</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Например 20 000"
              value={budget.savingsMonthly || ""}
              className="h-11 text-base"
              onChange={(e) =>
                onBudgetChange({
                  ...budget,
                  savingsMonthly: Number(e.target.value) || 0,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              {CALCULATOR_INPUTS.savingsHint}
            </p>
          </div>
          <GoalSectionContent
            goal={savingsGoal}
            result={result}
            onChange={onGoalChange}
          />
        </div>
      </ToggleBlock>

      <ToggleBlock
        id="toggle-buying"
        checked={ui.buying}
        onCheckedChange={handleBuyingToggle}
        label={CALCULATOR_TOGGLES.buying.label}
        hint={CALCULATOR_TOGGLES.buying.hint}
      >
        <div className="pt-4">
          <PurchaseSectionContent
            purchase={purchase}
            result={result}
            onChange={onPurchaseChange}
            hideEmptyHint
          />
        </div>
      </ToggleBlock>

      <ToggleBlock
        id="toggle-planned"
        checked={ui.plannedSpending}
        onCheckedChange={handlePlannedToggle}
        label={CALCULATOR_TOGGLES.plannedSpending.label}
        hint={CALCULATOR_TOGGLES.plannedSpending.hint}
      >
        <div className="space-y-2 pt-4">
          <Label>{CALCULATOR_INPUTS.plannedLabel}</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Например 15 000"
            value={budget.plannedVariableMonthly || ""}
            className="h-11 text-base"
            onChange={(e) =>
              onBudgetChange({
                ...budget,
                plannedVariableMonthly: Number(e.target.value) || 0,
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            {CALCULATOR_INPUTS.plannedHint}
          </p>
        </div>
      </ToggleBlock>
    </div>
  );
}
