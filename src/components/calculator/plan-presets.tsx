"use client";

import { CALCULATOR_INPUTS } from "@/data/calculator-copy";
import {
  CALCULATOR_PRESETS,
  type CalculatorPreset,
} from "@/data/calculator-presets";
import { cn } from "@/lib/utils";

interface PlanPresetsProps {
  onSelect: (preset: CalculatorPreset) => void;
  activeId?: string;
}

export function PlanPresets({ onSelect, activeId }: PlanPresetsProps) {
  return (
    <div className="soft-card p-4 sm:p-5">
      <p className="text-sm font-medium">{CALCULATOR_INPUTS.presetsTitle}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {CALCULATOR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={preset.description}
            onClick={() => onSelect(preset)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              activeId === preset.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:bg-secondary/60",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
