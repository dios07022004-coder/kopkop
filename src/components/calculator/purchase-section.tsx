"use client";

import { CALCULATOR_SECTIONS } from "@/data/calculator-copy";
import type { FinanceResult, PurchaseInput } from "@/lib/finance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatRub } from "@/lib/utils";

interface PurchaseSectionProps {
  purchase: PurchaseInput;
  result: FinanceResult;
  onChange: (purchase: PurchaseInput) => void;
  hideEmptyHint?: boolean;
}

function RatingSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl bg-secondary/40 p-4">
      <div className="flex items-center justify-between text-sm">
        <Label className="font-normal">{label}</Label>
        <span className="font-semibold text-primary">{value}/5</span>
      </div>
      <Slider min={1} max={5} step={1} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

export function PurchaseSectionContent({
  purchase,
  result,
  onChange,
  hideEmptyHint,
}: PurchaseSectionProps) {
  const decision = result.purchase;
  const copy = CALCULATOR_SECTIONS.purchase;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{copy.priceLabel}</Label>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Например 40 000"
          value={purchase.price || ""}
          className="h-11 text-base"
          onChange={(e) => onChange({ ...purchase, price: Number(e.target.value) || 0 })}
        />
      </div>

      {purchase.price > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <RatingSlider
              label={copy.urgencyLabel}
              value={purchase.urgency}
              onChange={(v) => onChange({ ...purchase, urgency: v })}
            />
            <RatingSlider
              label={copy.usefulnessLabel}
              value={purchase.usefulness}
              onChange={(v) => onChange({ ...purchase, usefulness: v })}
            />
          </div>

          {decision && (
            <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/20 p-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {copy.decision}
                </p>
                <p className="mt-1 font-semibold">{decision.decisionLabel}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {copy.why}
                </p>
                <p className="mt-1">{decision.explanation}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {copy.nextStep}
                </p>
                <p className="mt-1 whitespace-pre-line font-medium">{decision.nextStep}</p>
              </div>
              {decision.missingAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  С карты сейчас: {formatRub(result.core.availableForPurchaseNow)} · Нужно
                  накопить: {formatRub(decision.missingAmount)}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {!hideEmptyHint && purchase.price <= 0 && (
        <p className="text-sm text-muted-foreground">{copy.empty}</p>
      )}
    </div>
  );
}
