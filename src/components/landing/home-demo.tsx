"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyWaterfall, type WaterfallStep } from "@/components/calculator/charts";
import { computeFinance } from "@/lib/finance";
import { cn, formatRub } from "@/lib/utils";

/** Плавный «прирост» числа при изменении (премиальная микроанимация). */
function useCountUp(value: number, duration = 450) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    if (typeof requestAnimationFrame === "undefined") {
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

const MOOD = {
  healthy: { dot: "bg-[hsl(var(--success))]", ring: "surface-success", label: "Можно тратить спокойно" },
  caution: { dot: "bg-[hsl(var(--warning))]", ring: "surface-warning", label: "Тратьте осторожно" },
  danger: { dot: "bg-[hsl(var(--danger))]", ring: "surface-danger", label: "Доход не покрывает расходы" },
} as const;

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-11 text-base"
      />
    </div>
  );
}

export function HomeDemo() {
  const [income, setIncome] = useState(80000);
  const [mandatory, setMandatory] = useState(40000);
  const [savings, setSavings] = useState(0);

  const result = useMemo(
    () =>
      computeFinance({
        incomeMonthly: income,
        mandatoryMonthly: mandatory,
        savingsMonthly: savings,
        currentBalance: 0,
        minimumBalance: 0,
        plannedVariableMonthly: 0,
      }),
    [income, mandatory, savings],
  );

  const free = result.core.freeBudgetMonthly;
  const animatedFree = useCountUp(free);
  const mood: keyof typeof MOOD =
    free < 0 ? "danger" : free < 5000 ? "caution" : "healthy";
  const perDay = Math.max(0, Math.round(free / 30));

  const steps: WaterfallStep[] = [
    { label: "Доход за месяц", amount: income, kind: "add" },
    { label: "Обязательные траты", amount: mandatory, kind: "subtract" },
  ];
  if (savings > 0) {
    steps.push({ label: "Откладываю", amount: savings, kind: "subtract" });
  }
  steps.push({ label: "Свободно из зарплаты", amount: free, kind: "total" });

  return (
    <div className="soft-card overflow-hidden">
      <div className="grid gap-0 md:grid-cols-2">
        {/* Ввод */}
        <div className="space-y-4 p-5 sm:p-6">
          <p className="text-sm font-semibold text-muted-foreground">
            Введите 2 цифры — посчитаем сразу
          </p>
          <Field label="Сколько получу в месяц, ₽" value={income} onChange={setIncome} />
          <Field label="Обязательные траты (аренда, кредиты, ЖКХ), ₽" value={mandatory} onChange={setMandatory} />
          <Field label="Откладываю в месяц, ₽ (если есть)" value={savings} onChange={setSavings} />
        </div>

        {/* Ответ */}
        <div className="border-t border-border/60 bg-accent/30 p-5 sm:p-6 md:border-l md:border-t-0">
          <p className="text-sm font-medium text-muted-foreground">Свободно из зарплаты</p>
          <p
            className={cn(
              "mt-1 text-4xl font-bold tracking-tight",
              free < 0 ? "text-[hsl(var(--danger))]" : "text-primary",
            )}
          >
            {formatRub(animatedFree)}
          </p>
          {free > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">≈ {formatRub(perDay)} в день</p>
          )}

          <div className="mt-4">
            <MoneyWaterfall steps={steps} compact />
          </div>

          <div className={cn("mt-4 flex items-center gap-2 rounded-xl border px-3 py-2", MOOD[mood].ring)}>
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", MOOD[mood].dot)} aria-hidden />
            <span className="text-sm font-medium">{MOOD[mood].label}</span>
          </div>

          <Button className="mt-4 w-full rounded-xl" asChild>
            <Link href="/app">
              Открыть полный расчёт
              <ArrowRight className="ml-1 h-4 w-4 shrink-0" />
            </Link>
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Накопления, покупки и распределение — бесплатно, без регистрации
          </p>
        </div>
      </div>
    </div>
  );
}
