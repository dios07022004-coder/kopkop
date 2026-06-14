"use client";

import { useEffect, useState } from "react";
import { formatRub } from "@/lib/utils";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   Waterfall — «откуда взялась свободная сумма»
   Подписанные горизонтальные полосы: что прибавили, что вычли, и итог.
   ───────────────────────────────────────────── */

export type WaterfallStep = {
  label: string;
  amount: number;
  kind: "add" | "subtract" | "total";
  hint?: string;
};

const BAR_COLOR = {
  add: "bg-primary",
  subtract: "bg-[hsl(var(--danger))]/65",
  total: "bg-[hsl(var(--primary-dark))]",
} as const;

const SIGN = { add: "+", subtract: "−", total: "=" } as const;

export function MoneyWaterfall({
  steps,
  className,
  compact = false,
}: {
  steps: WaterfallStep[];
  className?: string;
  compact?: boolean;
}) {
  const max = Math.max(1, ...steps.map((s) => Math.abs(s.amount)));

  return (
    <ul className={cn("space-y-2.5", className)}>
      {steps.map((step) => {
        const width = Math.max(4, (Math.abs(step.amount) / max) * 100);
        const isTotal = step.kind === "total";
        return (
          <li
            key={step.label}
            className={cn(
              "grid grid-cols-[auto_1fr_auto] items-center gap-2.5",
              isTotal && "rounded-xl bg-accent/60 px-2.5 py-2",
            )}
          >
            <span
              className={cn(
                "w-3 text-center font-bold",
                step.kind === "subtract" ? "text-[hsl(var(--danger))]" : "text-primary",
              )}
              aria-hidden
            >
              {SIGN[step.kind]}
            </span>
            <div className="min-w-0">
              <p className={cn("truncate text-sm", isTotal ? "font-semibold" : "text-muted-foreground")}>
                {step.label}
              </p>
              {!compact && (
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", BAR_COLOR[step.kind])}
                    style={{ width: `${width}%` }}
                  />
                </div>
              )}
            </div>
            <span
              className={cn(
                "whitespace-nowrap text-sm tabular-nums",
                isTotal ? "text-base font-bold text-foreground" : "font-medium",
              )}
            >
              {formatRub(step.amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────────────────────────────────────────
   Donut — распределение по категориям
   ───────────────────────────────────────────── */

export type DonutSegment = {
  label: string;
  value: number;
};

const DONUT_PALETTE = [
  "hsl(158 64% 38%)",
  "hsl(180 50% 42%)",
  "hsl(38 92% 50%)",
  "hsl(262 52% 58%)",
  "hsl(210 55% 52%)",
  "hsl(0 65% 58%)",
];

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;

  // «рисующаяся» анимация при появлении
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0">
        <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
          <circle cx="75" cy="75" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="18" />
          {segments.map((seg, i) => {
            const len = (seg.value / total) * c;
            const dash = `${len} ${c - len}`;
            const el = (
              <circle
                key={seg.label}
                cx="75"
                cy="75"
                r={r}
                fill="none"
                stroke={DONUT_PALETTE[i % DONUT_PALETTE.length]}
                strokeWidth="18"
                strokeDasharray={drawn ? dash : `0 ${c}`}
                strokeDashoffset={-offset}
                style={{
                  transition: "stroke-dasharray 0.7s ease",
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && <span className="text-lg font-bold">{centerValue}</span>}
            {centerLabel && (
              <span className="px-2 text-[11px] leading-tight text-muted-foreground">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>

      <ul className="w-full space-y-2">
        {segments.map((seg, i) => (
          <li key={seg.label} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: DONUT_PALETTE[i % DONUT_PALETTE.length] }}
            />
            <span className="flex-1 truncate">{seg.label}</span>
            <span className="text-xs text-muted-foreground">
              {Math.round((seg.value / total) * 100)}%
            </span>
            <span className="w-24 text-right font-semibold tabular-nums">
              {formatRub(seg.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Timeline — прогресс накопления к цели/покупке
   ───────────────────────────────────────────── */

export function GoalTimeline({
  saved,
  target,
  monthsLabel,
  monthlyLabel,
}: {
  saved: number;
  target: number;
  monthsLabel: string;
  monthlyLabel: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">Накоплено</span>
        <span className="font-semibold">
          {formatRub(saved)} из {formatRub(target)}
        </span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="flex h-full items-center justify-end rounded-full bg-primary pr-1.5 text-[10px] font-bold text-white transition-all"
          style={{ width: `${Math.max(pct, 8)}%` }}
        >
          {pct >= 12 ? `${pct}%` : ""}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{monthlyLabel}</span>
        <span>{monthsLabel}</span>
      </div>
    </div>
  );
}
