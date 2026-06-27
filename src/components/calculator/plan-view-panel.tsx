"use client";

import { CALCULATOR_MAIN } from "@/data/calculator-copy";
import type {
  PlanAccumulationInfo,
  PlanViewModel,
} from "@/lib/finance/plan-view";
import { cn } from "@/lib/utils";

const MOOD_STYLES = {
  calm: "surface-success",
  caution: "surface-warning",
  danger: "surface-danger",
} as const;

const MOOD_BADGE = {
  calm: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
  caution: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
  danger: "bg-[hsl(var(--danger))]/15 text-[hsl(var(--danger))]",
} as const;

const TONE_TEXT = {
  success: "text-[hsl(var(--success))]",
  warning: "text-[hsl(var(--warning))]",
  danger: "text-[hsl(var(--danger))]",
  muted: "text-muted-foreground",
} as const;

function LimitCard({
  title,
  value,
  explain,
  nextStep,
  breakdown,
  large,
}: {
  title: string;
  value: string;
  explain: string;
  nextStep: string;
  breakdown?: string;
  large?: boolean;
}) {
  return (
    <article className="rounded-xl border border-border/60 bg-card/60 p-4">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p
        className={cn(
          "mt-1 font-bold tracking-tight text-primary",
          large ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl",
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-snug text-muted-foreground">{explain}</p>
      {breakdown && (
        <p className="mt-2 rounded-lg bg-secondary/50 px-2.5 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
          {breakdown}
        </p>
      )}
      <p className="mt-2 text-sm">
        <span className="text-muted-foreground">{CALCULATOR_MAIN.whatNext}: </span>
        {nextStep}
      </p>
    </article>
  );
}

function AccumulationCard({
  info,
  statusLabel,
  tone,
}: {
  info: PlanAccumulationInfo;
  statusLabel?: string;
  tone?: keyof typeof TONE_TEXT;
}) {
  return (
    <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{info.title}</p>
        {statusLabel && (
          <span className={cn("text-sm font-medium", TONE_TEXT[tone ?? "muted"])}>
            {statusLabel}
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">{CALCULATOR_MAIN.toSave}</p>
          <p className="font-bold text-primary">{info.toSave}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{CALCULATOR_MAIN.timeline}</p>
          <p className="font-semibold">{info.timeline}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{CALCULATOR_MAIN.monthlyRate}</p>
          <p className="font-semibold">{info.monthlyRate}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{CALCULATOR_MAIN.fundingSource}: </span>
        {info.fundingSource}
      </p>
      {info.lifeImpact && (
        <p className="mt-2 text-sm text-[hsl(var(--warning))]">
          <span className="font-medium">{CALCULATOR_MAIN.lifeImpact}: </span>
          {info.lifeImpact}
        </p>
      )}
    </div>
  );
}

interface PlanViewPanelProps {
  view: PlanViewModel;
}

export function PlanViewPanel({ view }: PlanViewPanelProps) {
  return (
    <section
      className={cn("soft-card space-y-4 border-2 p-5 sm:p-6", MOOD_STYLES[view.budget.mood])}
      aria-live="polite"
    >
      {view.warnings.length > 0 && (
        <ul className="surface-warning space-y-1.5 rounded-lg border px-3 py-2.5 text-sm">
          {view.warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      )}

      <LimitCard
        title={CALCULATOR_MAIN.spendTitle}
        value={view.spendMonth.formatted}
        explain={view.spendMonth.explain}
        nextStep={view.spendMonth.nextStep}
        large
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <LimitCard
          title={CALCULATOR_MAIN.fromSalary}
          value={view.spendSalary.formatted}
          explain={view.spendSalary.explain}
          nextStep={view.spendSalary.nextStep}
        />
        <LimitCard
          title={CALCULATOR_MAIN.fromCardSafe}
          value={view.spendCard.formatted}
          explain={view.spendCard.explain}
          nextStep={view.spendCard.nextStep}
          breakdown={view.spendCard.breakdown}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {CALCULATOR_MAIN.fromCardHint}
      </p>

      {view.goal.active && view.goal.accumulation && (
        <AccumulationCard
          info={view.goal.accumulation}
          statusLabel={view.goal.statusLabel}
          tone={view.goal.tone}
        />
      )}

      {view.purchase.active && view.purchase.accumulation && (
        <AccumulationCard info={view.purchase.accumulation} tone={view.purchase.tone} />
      )}

      {view.purchase.active ? (
        <div className="rounded-xl border border-border/60 bg-card/60 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            {CALCULATOR_MAIN.purchaseTitle}
          </p>
          <p className={cn("mt-1 text-xl font-bold", TONE_TEXT[view.purchase.tone])}>
            {view.purchase.verdict}
          </p>
          {view.purchase.shortRule && (
            <p className="mt-2 text-sm leading-snug text-muted-foreground">
              <span className="font-medium text-foreground">{CALCULATOR_MAIN.purchaseWhy}: </span>
              {view.purchase.shortRule}
            </p>
          )}
          {view.purchase.ifBuyNow && (
            <p className="mt-2 text-sm text-muted-foreground">{view.purchase.ifBuyNow}</p>
          )}
          {!view.purchase.accumulation && (
            <p className="mt-2 text-sm font-medium">
              <span className="text-muted-foreground">{CALCULATOR_MAIN.whatNext}: </span>
              {view.purchase.nextStep}
            </p>
          )}
          {view.purchase.accumulation && (
            <p className="mt-1 text-sm text-muted-foreground">
              План накопления — в карточке выше.
            </p>
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {CALCULATOR_MAIN.purchaseOff}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
        <span className="text-sm text-muted-foreground">{CALCULATOR_MAIN.budgetTitle}</span>
        <span
          className={cn(
            "rounded-full px-3 py-0.5 text-sm font-semibold",
            MOOD_BADGE[view.budget.mood],
          )}
        >
          {view.budget.label}
        </span>
        <p className="w-full text-sm text-muted-foreground">{view.budget.explain}</p>
        <p className="w-full text-sm font-medium">
          <span className="text-muted-foreground">{CALCULATOR_MAIN.whatNext}: </span>
          {view.budget.nextStep}
        </p>
      </div>

      {view.improvementHints.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold">{CALCULATOR_MAIN.actionsTitle}</p>
          <ul className="mt-2 space-y-2 text-sm">
            {view.improvementHints.map((h) => (
              <li key={h.id} className="leading-snug">
                → {h.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-center text-xs">
        <p className="font-medium text-foreground">
          {CALCULATOR_MAIN.confidenceTitle}: {view.confidence.label}
        </p>
        <p className="mt-1 text-muted-foreground">{view.confidence.explain}</p>
        {view.confidence.checks.length > 0 && (
          <p className="mt-2 text-muted-foreground">
            {view.confidence.checks.join(" · ")}
          </p>
        )}
      </div>

      {view.goal.active && !view.goal.accumulation && (
        <div className="rounded-xl border border-border/60 bg-card/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Цель «{view.goal.name}»</p>
            <span className={cn("text-sm font-medium", TONE_TEXT[view.goal.tone])}>
              {view.goal.statusLabel}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{view.goal.explain}</p>
          <p className="mt-2 text-sm font-medium">
            <span className="text-muted-foreground">{CALCULATOR_MAIN.whatNext}: </span>
            {view.goal.nextStep}
          </p>
        </div>
      )}
    </section>
  );
}
