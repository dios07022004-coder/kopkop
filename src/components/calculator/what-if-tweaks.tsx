"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import type { BudgetInput } from "@/lib/finance";
import { computeBudgetCore } from "@/lib/finance/core";
import { formatRub } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface WhatIfTweak {
  id: string;
  label: string;
  apply: (budget: BudgetInput) => BudgetInput;
}

const WHAT_IF_TWEAKS: WhatIfTweak[] = [
  {
    id: "income-up",
    label: "Доход вырастет на 10 000 ₽",
    apply: (b) => ({ ...b, incomeMonthly: b.incomeMonthly + 10_000 }),
  },
  {
    id: "mandatory-down",
    label: "Обязательные траты −5 000 ₽",
    apply: (b) => ({
      ...b,
      mandatoryMonthly: Math.max(0, b.mandatoryMonthly - 5_000),
      mandatoryExpenses: [
        {
          id: "mandatory-total",
          label: "Обязательные траты",
          amount: Math.max(0, b.mandatoryMonthly - 5_000),
        },
      ],
    }),
  },
  {
    id: "balance-up",
    label: "На счёте появится +10 000 ₽",
    apply: (b) => ({ ...b, currentBalance: b.currentBalance + 10_000 }),
  },
  {
    id: "cushion-down",
    label: "Уменьшить подушку на 5 000 ₽",
    apply: (b) => ({ ...b, minimumBalance: Math.max(0, b.minimumBalance - 5_000) }),
  },
];

interface WhatIfTweaksProps {
  onApply: (budget: BudgetInput) => void;
  budget: BudgetInput;
}

export function WhatIfTweaks({ onApply, budget }: WhatIfTweaksProps) {
  const rows = useMemo(() => {
    const before = computeBudgetCore(budget).availableForLife;
    return WHAT_IF_TWEAKS.map((tweak) => {
      const after = computeBudgetCore(tweak.apply(budget)).availableForLife;
      return { ...tweak, before, after, delta: after - before };
    });
  }, [budget]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Посмотрите, как изменится сумма «Свободно на жизнь», если что-то поменяется. Нажмите
        вариант — цифры наверху обновятся.
      </p>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onApply(row.apply(budget))}
            className="flex w-full flex-col items-start gap-2 rounded-xl border border-border/60 bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <span className="text-sm font-medium">{row.label}</span>
            <span className="flex shrink-0 items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">{formatRub(row.before)}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{formatRub(row.after)}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  row.delta >= 0
                    ? "bg-[hsl(var(--success))]/12 text-[hsl(162_60%_28%)]"
                    : "bg-[hsl(var(--danger))]/12 text-[hsl(var(--danger))]",
                )}
              >
                {row.delta >= 0 ? "+" : "−"}
                {formatRub(Math.abs(row.delta))}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
