"use client";

import { useState } from "react";
import { GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildPlanViewModel,
  diffPlanSnapshots,
  type PlanViewModel,
} from "@/lib/finance/plan-view";
import { CALCULATOR_MAIN } from "@/data/calculator-copy";
import type { BudgetInput, FinanceResult, SavingsGoalInput } from "@/lib/finance";
import type { PlanViewOptions } from "@/lib/finance/plan-view";
import { cn } from "@/lib/utils";

interface ScenarioCompareProps {
  budget: BudgetInput;
  result: FinanceResult;
  goal: SavingsGoalInput;
  options: PlanViewOptions;
  purchaseInput?: Parameters<typeof buildPlanViewModel>[4];
}

type Snapshot = Pick<
  PlanViewModel,
  "spendMonth" | "spendSalary" | "spendCard" | "purchase" | "budget" | "goal"
>;

const MOOD_LABEL = { calm: "Спокойно", caution: "Осторожно", danger: "Опасно" };

export function ScenarioCompare({
  budget,
  result,
  goal,
  options,
  purchaseInput,
}: ScenarioCompareProps) {
  const [baseline, setBaseline] = useState<Snapshot | null>(null);

  const current = buildPlanViewModel(
    budget,
    result,
    goal,
    options,
    purchaseInput,
  );
  const snapshot: Snapshot = {
    spendMonth: current.spendMonth,
    spendSalary: current.spendSalary,
    spendCard: current.spendCard,
    purchase: current.purchase,
    budget: current.budget,
    goal: current.goal,
  };

  const diff = baseline ? diffPlanSnapshots(baseline, snapshot) : [];

  const tableRows = baseline
    ? [
        {
          label: "На жизнь в месяце",
          before: baseline.spendMonth.formatted,
          after: snapshot.spendMonth.formatted,
        },
        {
          label: "Из зарплаты",
          before: baseline.spendSalary.formatted,
          after: snapshot.spendSalary.formatted,
        },
        {
          label: "С карты без риска",
          before: baseline.spendCard.formatted,
          after: snapshot.spendCard.formatted,
        },
        {
          label: "Решение по покупке",
          before: baseline.purchase.verdict,
          after: snapshot.purchase.verdict,
        },
        {
          label: "Статус бюджета",
          before: MOOD_LABEL[baseline.budget.mood],
          after: MOOD_LABEL[snapshot.budget.mood],
        },
        ...(baseline.goal.active || snapshot.goal.active
          ? [
              {
                label: "Срок до цели",
                before: baseline.goal.monthsToGoal,
                after: snapshot.goal.monthsToGoal,
              },
            ]
          : []),
      ].filter((r) => r.before !== r.after)
    : [];

  return (
    <div className="soft-card space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{CALCULATOR_MAIN.compareTitle}</p>
          <p className="text-xs text-muted-foreground">
            Сохраните план и измените одну цифру — увидите разницу
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBaseline(snapshot)}
          >
            <GitCompare className="mr-2 h-4 w-4" />
            {CALCULATOR_MAIN.compareBaseline}
          </Button>
          {baseline && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setBaseline(null)}
            >
              <X className="mr-2 h-4 w-4" />
              {CALCULATOR_MAIN.compareClear}
            </Button>
          )}
        </div>
      </div>

      {!baseline && (
        <p className="text-sm text-muted-foreground">
          Нажмите «Запомнить» или используйте кнопки «Что будет, если…» ниже.
        </p>
      )}

      {baseline && tableRows.length === 0 && (
        <p className="text-sm text-muted-foreground">Пока ничего не изменилось.</p>
      )}

      {baseline && tableRows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[280px] text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/40 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Показатель</th>
                <th className="px-3 py-2 font-medium">{CALCULATOR_MAIN.compareColBefore}</th>
                <th className="px-3 py-2 font-medium">{CALCULATOR_MAIN.compareColAfter}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.label} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2.5 font-medium">{row.label}</td>
                  <td className="px-3 py-2.5 text-muted-foreground line-through">
                    {row.before}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 font-semibold",
                      row.after !== row.before ? "text-primary" : "",
                    )}
                  >
                    {row.after}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {diff.length > 0 && tableRows.length === 0 && (
        <ul className="space-y-2 text-sm">
          {diff.map((row) => (
            <li
              key={row.label}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/40 px-3 py-2"
            >
              <span className="font-medium">{row.label}</span>
              <span className="text-muted-foreground line-through">{row.before}</span>
              <span className="font-semibold text-primary">→ {row.after}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
