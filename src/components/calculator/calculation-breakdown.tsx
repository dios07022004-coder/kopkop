"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { BreakdownStep } from "@/lib/finance";
import { cn, formatRub } from "@/lib/utils";

interface CalculationBreakdownProps {
  steps: BreakdownStep[];
}

export function CalculationBreakdown({ steps }: CalculationBreakdownProps) {
  return (
    <Accordion type="single" collapsible className="soft-card rounded-2xl border px-4">
      <AccordionItem value="breakdown" className="border-0">
        <AccordionTrigger className="text-sm font-medium hover:no-underline">
          Формулы и детали расчёта
        </AccordionTrigger>
        <AccordionContent>
          <dl className="space-y-2 pb-2">
            {steps.map((step) => (
              <div
                key={step.label}
                className="flex items-start justify-between gap-4 text-sm"
              >
                <dt className="text-muted-foreground">
                  {step.label}
                  {step.note && (
                    <span className="mt-0.5 block text-xs">{step.note}</span>
                  )}
                </dt>
                <dd
                  className={cn(
                    "shrink-0 font-medium tabular-nums",
                    step.value < 0 && "text-muted-foreground",
                    step.label.includes("Свободный") && step.value < 0 && "text-red-600",
                    step.label.includes("На жизнь") && "text-primary",
                  )}
                >
                  {step.value < 0 ? "−" : ""}
                  {formatRub(Math.abs(step.value))}
                </dd>
              </div>
            ))}
          </dl>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
