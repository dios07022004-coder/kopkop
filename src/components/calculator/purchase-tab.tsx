"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthlyTradeoff } from "@/components/calculator/monthly-tradeoff";
import type { FinanceResult, PurchaseInput } from "@/lib/finance";
import { cn, formatRub, formatMonths } from "@/lib/utils";

const LOW_REMAINING = 10000;

type Tone = "ok" | "caution" | "danger";

const TONE_RING: Record<Tone, string> = {
  ok: "surface-success",
  caution: "surface-warning",
  danger: "surface-danger",
};

export function PurchaseTab({
  purchase,
  result,
  onChange,
}: {
  purchase: PurchaseInput;
  result: FinanceResult;
  onChange: (next: PurchaseInput) => void;
}) {
  // Один якорь — свободно на жизнь = доход − обязательные.
  const life = result.core.remainingAfterMandatory;
  const price = purchase.price;

  const afterLife = life - price;
  const affordThisMonth = price > 0 && price <= life;
  const need = Math.max(0, price - life);
  const monthsToSave = life > 0 ? Math.ceil(price / life) : null;

  const field = (
    <div className="space-y-1.5">
      <Label>Что хочу купить и сколько стоит, ₽</Label>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="Например 40 000"
        value={price || ""}
        className="h-11 text-base"
        onChange={(e) => onChange({ ...purchase, price: Number(e.target.value) || 0 })}
      />
    </div>
  );

  if (price <= 0) {
    return (
      <div className="space-y-4">
        {field}
        <p className="text-sm text-muted-foreground">
          Укажите цену — посчитаем, вписывается ли покупка в ваши свободные {formatRub(life)} и
          сколько останется на жизнь.
        </p>
      </div>
    );
  }

  let tone: Tone = "ok";
  let verdict = "Можно купить";
  const lines: string[] = [];

  if (affordThisMonth) {
    lines.push(
      `Покупка ${formatRub(price)} вписывается в свободные ${formatRub(
        life,
      )} этого месяца. После неё на жизнь останется ${formatRub(afterLife)}.`,
    );
    if (afterLife < LOW_REMAINING) {
      tone = "caution";
      verdict = "Можно, но впритык";
      lines.push(`Останется всего ${formatRub(afterLife)} — если месяц непростой, лучше подождать.`);
    }
  } else {
    tone = life > 0 ? "caution" : "danger";
    verdict = monthsToSave ? `Копить ${formatMonths(monthsToSave)}` : "Пока не по карману";
    lines.push(
      `Не хватает ${formatRub(need)} сверх свободных денег этого месяца (${formatRub(life)}).`,
    );
    if (life > 0 && monthsToSave) {
      lines.push(
        `Откладывайте часть свободных денег — накопите за ${formatMonths(monthsToSave)}.`,
      );
    } else {
      lines.push(
        "Свободных денег нет — доход не покрывает обязательные. Сначала уменьшите обязательные траты.",
      );
    }
  }

  return (
    <div className="space-y-4">
      {field}

      <div className={cn("rounded-2xl border-2 p-5", TONE_RING[tone])}>
        <p className="text-xs font-medium text-muted-foreground">Решение</p>
        <p className="mt-0.5 text-xl font-bold">{verdict}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>

      {!affordThisMonth && life > 0 && monthsToSave && (
        <MonthlyTradeoff
          setAside={Math.ceil(price / monthsToSave)}
          freeBudget={life}
          title={`Если копить ${formatMonths(monthsToSave)} на эту покупку`}
        />
      )}
    </div>
  );
}
