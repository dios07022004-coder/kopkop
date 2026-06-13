"use client";

import { MoneyWaterfall, type WaterfallStep } from "@/components/calculator/charts";
import type { BudgetInput, FinanceResult } from "@/lib/finance";
import { formatRub } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Mood = "calm" | "caution" | "danger";

const MOOD = {
  calm: { dot: "bg-[hsl(var(--success))]", ring: "surface-success", label: "Бюджет в порядке" },
  caution: { dot: "bg-[hsl(var(--warning))]", ring: "surface-warning", label: "Счёт ниже подушки" },
  danger: { dot: "bg-[hsl(var(--danger))]", ring: "surface-danger", label: "Доход не покрывает обязательные" },
} as const;

export function PrimaryAnswer({
  budget,
  result,
}: {
  budget: BudgetInput;
  result: FinanceResult;
}) {
  // Один понятный якорь: Доход − Обязательные. Накопления/покупки — это уже решения
  // из этой суммы (см. вкладки). Счёт и подушка — отдельный индикатор ниже.
  const free = result.core.remainingAfterMandatory;
  const perDay = Math.max(0, Math.round(free / 30));

  const accountLow = budget.currentBalance < budget.minimumBalance;
  const mood: Mood = free <= 0 ? "danger" : accountLow ? "caution" : "calm";

  const steps: WaterfallStep[] = [
    { label: "Доход за месяц", amount: budget.incomeMonthly, kind: "add" },
    { label: "Обязательные траты (аренда, кредиты, ЖКХ)", amount: budget.mandatoryMonthly, kind: "subtract" },
    { label: "Свободно на жизнь", amount: free, kind: "total" },
  ];

  return (
    <section className="space-y-4" aria-live="polite">
      <div className="soft-card overflow-hidden">
        {/* Главная цифра */}
        <div className="border-b border-border/60 bg-accent/40 p-6 text-center sm:p-7">
          <p className="text-sm font-medium text-muted-foreground">
            Свободно в этом месяце (доход минус обязательные)
          </p>
          <p
            className={cn(
              "mt-1 text-4xl font-bold tracking-tight sm:text-5xl",
              free <= 0 ? "text-[hsl(var(--danger))]" : "text-primary",
            )}
          >
            {formatRub(free)}
          </p>
          {free > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              это примерно <span className="font-semibold text-foreground">{formatRub(perDay)} в день</span>{" "}
              <span className="text-xs">({formatRub(free)} ÷ 30)</span>
            </p>
          )}
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Это ваш бюджет на жизнь. Из него вы решаете, сколько потратить, сколько отложить и
            можете ли позволить покупку — на вкладках ниже.
          </p>
        </div>

        {/* Waterfall — как получилась сумма (2 шага) */}
        <div className="p-5 sm:p-6">
          <p className="mb-3 text-sm font-medium">Как получилась сумма</p>
          <MoneyWaterfall steps={steps} />
        </div>

        {/* Состояние счёта — отдельно, не примешано к бюджету */}
        <div className={cn("flex items-start gap-3 border-t border-border/60 p-4 sm:p-5", MOOD[mood].ring)}>
          <span className={cn("mt-1 h-3 w-3 shrink-0 rounded-full", MOOD[mood].dot)} aria-hidden />
          <div>
            <p className="font-semibold">{MOOD[mood].label}</p>
            <p className="mt-0.5 text-sm">
              На счёте {formatRub(budget.currentBalance)} · подушка {formatRub(budget.minimumBalance)}.{" "}
              {free <= 0
                ? "Доходом не покрываются обязательные траты — это главное, что нужно исправить."
                : accountLow
                  ? `Счёт ниже подушки — отложите ${formatRub(
                      budget.minimumBalance - budget.currentBalance,
                    )}, чтобы был запас на форс-мажор. Это не влияет на бюджет на жизнь выше.`
                  : "Счёт выше подушки — запас на месте."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
