"use client";

import type { BreakdownStep, FinanceResult } from "@/lib/finance";
import { CalculationBreakdown } from "@/components/calculator/calculation-breakdown";
import { Progress } from "@/components/ui/progress";
import { formatRub } from "@/lib/utils";

interface AdvancedSettingsProps {
  result: FinanceResult;
  breakdown: BreakdownStep[];
}

export function AdvancedSettings({ result, breakdown }: AdvancedSettingsProps) {
  const { core, allocation } = result;

  return (
    <div className="space-y-5">
      {core.availableForLife > 0 && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/20 p-4">
          <div>
            <p className="text-sm font-medium">Куда распределить «на жизнь»</p>
            <p className="text-xs text-muted-foreground">
              Доли по умолчанию — можно настроить в полной таблице Excel
            </p>
          </div>
          {allocation.allocations.map((cat) => {
            const pct =
              core.availableForLife > 0
                ? (cat.amount / core.availableForLife) * 100
                : 0;
            return (
              <div key={cat.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{cat.label}</span>
                  <span className="font-semibold">{formatRub(cat.amount)}</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}
        </div>
      )}

      <CalculationBreakdown steps={breakdown} />
    </div>
  );
}
