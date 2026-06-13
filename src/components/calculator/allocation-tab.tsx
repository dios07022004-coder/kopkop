"use client";

import { useState } from "react";
import { DonutChart } from "@/components/calculator/charts";
import { Input } from "@/components/ui/input";
import type { BudgetCategory } from "@/lib/finance/types";
import { formatRub } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Mode = "categories" | "rule";

/** Распределяет «свободно на жизнь» (base = доход − обязательные) по категориям. */
export function AllocationTab({
  base,
  categories,
  onCategoriesChange,
}: {
  base: number;
  categories: BudgetCategory[];
  onCategoriesChange: (next: BudgetCategory[]) => void;
}) {
  const [mode, setMode] = useState<Mode>("categories");

  const totalPercent = categories.reduce((s, c) => s + c.percent, 0) || 100;
  const amountFor = (percent: number) =>
    base > 0 ? Math.round((base * percent) / totalPercent) : 0;

  const ruleSegments = [
    { label: "Нужное (еда, транспорт, быт) — 50%", value: Math.round(base * 0.5) },
    { label: "Желания (развлечения, кафе) — 30%", value: Math.round(base * 0.3) },
    { label: "Накопления и подушка — 20%", value: Math.round(base * 0.2) },
  ];

  const setPercent = (id: string, percent: number) => {
    onCategoriesChange(
      categories.map((c) => (c.id === id ? { ...c, percent: Math.max(0, percent) } : c)),
    );
  };

  if (base <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Свободных денег в этом месяце нет: доход не покрывает обязательные траты. Сначала
        уменьшите обязательные расходы или увеличьте доход.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-xl border border-border bg-secondary/40 p-1">
        {(
          [
            ["categories", "По категориям"],
            ["rule", "Правило 50/30/20"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              mode === key ? "bg-card shadow-sm" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "categories" ? (
        <>
          <DonutChart
            segments={categories.map((c) => ({ label: c.label, value: amountFor(c.percent) }))}
            centerValue={formatRub(base)}
            centerLabel="на жизнь"
          />

          <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Настройте доли под себя (%). Сумма долей: {categories.reduce((s, c) => s + c.percent, 0)}%
            </p>
            <ul className="space-y-2">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 truncate">{c.label}</span>
                  <span className="text-muted-foreground">{formatRub(amountFor(c.percent))}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={c.percent || ""}
                    onChange={(e) => setPercent(c.id, Number(e.target.value) || 0)}
                    className="h-9 w-16 text-center"
                  />
                  <span className="w-4 text-muted-foreground">%</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Доли можно задать любые — пересчитаем пропорционально.
            </p>
          </div>
        </>
      ) : (
        <>
          <DonutChart segments={ruleSegments} centerValue={formatRub(base)} centerLabel="на жизнь" />
          <p className="rounded-xl bg-secondary/30 p-4 text-sm text-muted-foreground">
            Популярное правило: половину свободных денег — на необходимое, треть — на желания,
            пятую часть — в накопления. Простой ориентир, если не хочется считать по категориям.
          </p>
        </>
      )}
    </div>
  );
}
