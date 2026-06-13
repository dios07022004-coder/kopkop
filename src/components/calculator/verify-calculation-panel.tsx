"use client";

import { CALCULATOR_SECTIONS } from "@/data/calculator-copy";
import {
  buildVerifyCalculationView,
  getWhyChainStepHint,
} from "@/lib/finance/verify-calculation";
import type { BudgetInput, FinanceResult } from "@/lib/finance";

interface VerifyCalculationPanelProps {
  budget: BudgetInput;
  result: FinanceResult;
}

export function VerifyCalculationPanel({
  budget,
  result,
}: VerifyCalculationPanelProps) {
  const view = buildVerifyCalculationView(budget, result);
  const copy = CALCULATOR_SECTIONS.verify;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">{copy.chainTitle}</h3>
        <p className="text-xs text-muted-foreground">{view.chainIntro}</p>
        <ol className="space-y-2">
          {view.chainSteps.map((step, i) => {
            const hint = getWhyChainStepHint(step.label);
            return (
              <li
                key={`${step.label}-${i}`}
                className="rounded-lg bg-secondary/40 px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {step.sign !== "=" && (
                      <span className="mr-2 font-mono text-xs">{step.sign}</span>
                    )}
                    {step.label}
                  </span>
                  <span className="shrink-0 font-semibold">{step.amount}</span>
                </div>
                {hint && (
                  <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p>
                )}
              </li>
            );
          })}
        </ol>
        {view.chainCheck && (
          <p className="rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-xs leading-relaxed">
            {view.chainCheck}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{view.chainNote}</p>
      </section>

      <section className="space-y-4 border-t border-border/60 pt-5">
        <div>
          <h3 className="text-sm font-medium">{copy.formulasTitle}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{view.formulasIntro}</p>
        </div>
        {view.formulas.map((block) => (
          <article
            key={block.id}
            className="space-y-2 rounded-lg bg-secondary/30 px-3 py-3"
          >
            <h4 className="text-sm font-medium">{block.title}</h4>
            <p className="text-xs text-muted-foreground">{block.question}</p>
            <p className="rounded-md bg-background px-3 py-2 font-mono text-sm leading-relaxed">
              {block.formula}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {block.explain}
            </p>
            {block.note && (
              <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                {block.note}
              </p>
            )}
          </article>
        ))}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {view.threeNumbersNote}
        </p>
      </section>
    </div>
  );
}
