"use client";

import { CALCULATOR_SECTIONS } from "@/data/calculator-copy";
import type { FinanceResult, SavingsGoalInput } from "@/lib/finance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GoalSectionProps {
  goal: SavingsGoalInput;
  result: FinanceResult;
  onChange: (goal: SavingsGoalInput) => void;
}

const STATUS_VARIANT: Record<
  NonNullable<FinanceResult["savingsGoal"]>["status"],
  "success" | "warning" | "danger" | "secondary"
> = {
  ok: "success",
  achieved: "success",
  warning: "warning",
  risk: "danger",
  impossible: "danger",
};

export function GoalSectionContent({
  goal,
  result,
  onChange,
}: GoalSectionProps) {
  const savings = result.savingsGoal;
  const copy = CALCULATOR_SECTIONS.goal;
  const hasGoal = goal.targetAmount > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{copy.nameLabel}</Label>
          <Input
            value={goal.goalName}
            className="h-11 text-base"
            placeholder="Например: машина, отпуск"
            onChange={(e) => onChange({ ...goal, goalName: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{copy.targetLabel}</Label>
          <Input
            type="number"
            min={0}
            value={goal.targetAmount || ""}
            className="h-11 text-base"
            onChange={(e) =>
              onChange({ ...goal, targetAmount: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>{copy.savedLabel}</Label>
          <Input
            type="number"
            min={0}
            value={goal.currentSaved || ""}
            className="h-11 text-base"
            onChange={(e) =>
              onChange({ ...goal, currentSaved: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{copy.deadlineLabel}</Label>
          <Input
            type="number"
            min={0}
            placeholder="Не обязательно"
            value={goal.deadlineMonths ?? ""}
            className="h-11 text-base"
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange({
                ...goal,
                deadlineMonths: v > 0 ? v : undefined,
              });
            }}
          />
        </div>
        <div className="flex items-start gap-2 sm:col-span-2">
          <Checkbox
            id="canUseReserve"
            checked={goal.canUseReserve}
            onCheckedChange={(checked) =>
              onChange({ ...goal, canUseReserve: checked === true })
            }
          />
          <Label htmlFor="canUseReserve" className="font-normal leading-snug">
            {copy.reserveCheckbox}
          </Label>
        </div>
      </div>

      {!hasGoal && (
        <p className="text-sm text-muted-foreground">{copy.empty}</p>
      )}

      {hasGoal && savings && (
        <div
          className={cn(
            "rounded-xl border p-4",
            savings.status === "ok" || savings.status === "achieved"
              ? "surface-success"
              : savings.status === "warning"
                ? "surface-warning"
                : "surface-danger",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-semibold">{savings.summary}</p>
            <Badge variant={STATUS_VARIANT[savings.status]}>{savings.statusLabel}</Badge>
          </div>
          <Progress value={savings.progressPercent} className="mt-3 h-2" />
          {savings.reserveNote && (
            <p className="mt-3 text-sm text-[hsl(var(--warning))]">{savings.reserveNote}</p>
          )}
        </div>
      )}
    </div>
  );
}
