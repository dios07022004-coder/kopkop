"use client";

import { formatRub } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Показывает месячный размен: сколько откладывать и сколько останется на жизнь.
 * Отвечает на вопрос «сколько можно тратить, если я коплю».
 */
export function MonthlyTradeoff({
  setAside,
  freeBudget,
  title = "Если откладывать на это каждый месяц",
}: {
  setAside: number;
  freeBudget: number;
  title?: string;
}) {
  const lifeLeft = freeBudget - setAside;
  const perDay = Math.max(0, Math.round(lifeLeft / 30));
  const enough = lifeLeft >= 0;

  const total = Math.max(1, freeBudget, setAside);
  const savePct = Math.min(100, (setAside / total) * 100);
  const lifePct = Math.max(0, Math.min(100, (lifeLeft / total) * 100));

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
      <p className="text-sm font-medium">{title}</p>

      {/* Полоса-размен */}
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${savePct}%` }} />
        {enough && (
          <div
            className="h-full bg-[hsl(180_45%_55%)]"
            style={{ width: `${lifePct}%` }}
          />
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-card p-3">
          <p className="text-xs text-muted-foreground">Откладывать на цель</p>
          <p className="mt-0.5 text-lg font-bold text-primary">{formatRub(setAside)}</p>
          <p className="text-xs text-muted-foreground">в месяц</p>
        </div>
        <div className="rounded-lg bg-card p-3">
          <p className="text-xs text-muted-foreground">Останется на жизнь</p>
          <p
            className={cn(
              "mt-0.5 text-lg font-bold",
              enough ? "text-foreground" : "text-[hsl(var(--danger))]",
            )}
          >
            {formatRub(lifeLeft)}
          </p>
          <p className="text-xs text-muted-foreground">
            {enough ? `в месяц · ≈ ${formatRub(perDay)} в день` : "в месяц — не хватает потока"}
          </p>
        </div>
      </div>

      {!enough && (
        <p className="mt-3 text-sm text-[hsl(var(--danger))]">
          Чтобы откладывать столько, не хватает {formatRub(-lifeLeft)} в месяц — придётся брать
          со счёта или растянуть срок.
        </p>
      )}
    </div>
  );
}
