"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { CALCULATOR_INPUTS } from "@/data/calculator-copy";
import type { BudgetInput } from "@/lib/finance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PlanInputsProps {
  budget: BudgetInput;
  onBudgetChange: (budget: BudgetInput) => void;
}

function TooltipLabel({
  label,
  tooltip,
}: {
  label: string;
  tooltip: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <span title={tooltip} className="text-muted-foreground">
        <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">{tooltip}</span>
      </span>
    </div>
  );
}

export function PlanInputs({ budget, onBudgetChange }: PlanInputsProps) {
  const [showHelp, setShowHelp] = useState(false);

  const setMandatory = (amount: number) => {
    onBudgetChange({
      ...budget,
      mandatoryMonthly: amount,
      mandatoryExpenses: [
        { id: "mandatory-total", label: "Обязательные траты", amount },
      ],
    });
  };

  const fields = [
    {
      key: "income",
      label: CALCULATOR_INPUTS.income.label,
      tooltip: CALCULATOR_INPUTS.income.tooltip,
      placeholder: CALCULATOR_INPUTS.income.placeholder,
      value: budget.incomeMonthly,
      onChange: (v: number) => onBudgetChange({ ...budget, incomeMonthly: v }),
    },
    {
      key: "balance",
      label: CALCULATOR_INPUTS.balance.label,
      tooltip: CALCULATOR_INPUTS.balance.tooltip,
      placeholder: CALCULATOR_INPUTS.balance.placeholder,
      value: budget.currentBalance,
      onChange: (v: number) => onBudgetChange({ ...budget, currentBalance: v }),
    },
    {
      key: "mandatory",
      label: CALCULATOR_INPUTS.mandatory.label,
      tooltip: CALCULATOR_INPUTS.mandatory.tooltip,
      placeholder: CALCULATOR_INPUTS.mandatory.placeholder,
      value: budget.mandatoryMonthly,
      onChange: setMandatory,
    },
    {
      key: "reserve",
      label: CALCULATOR_INPUTS.reserve.label,
      tooltip: CALCULATOR_INPUTS.reserve.tooltip,
      placeholder: CALCULATOR_INPUTS.reserve.placeholder,
      value: budget.minimumBalance,
      onChange: (v: number) => onBudgetChange({ ...budget, minimumBalance: v }),
    },
  ] as const;

  return (
    <div className="soft-card space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">{CALCULATOR_INPUTS.sectionTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {CALCULATOR_INPUTS.sectionSubtitle}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <TooltipLabel label={field.label} tooltip={field.tooltip} />
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={field.placeholder}
              value={field.value || ""}
              className="h-11 text-base"
              onChange={(e) => field.onChange(Number(e.target.value) || 0)}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setShowHelp((v) => !v)}
        aria-expanded={showHelp}
      >
        {CALCULATOR_INPUTS.fieldsHelpTitle}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", showHelp && "rotate-180")}
        />
      </button>
      {showHelp && (
        <ul className="space-y-2 rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">
          {fields.map((field) => (
            <li key={field.key}>
              <span className="font-medium text-foreground">{field.label}:</span>{" "}
              {field.tooltip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
