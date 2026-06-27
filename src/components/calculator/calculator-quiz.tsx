"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Wallet, Sparkles } from "lucide-react";
import type { BudgetInput, FinanceResult } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrimaryAnswer } from "@/components/calculator/primary-answer";
import { cn } from "@/lib/utils";

type FieldKey = "incomeMonthly" | "currentBalance" | "mandatoryMonthly" | "minimumBalance";

type Step = {
  key: FieldKey;
  title: string;
  hint: string;
  placeholder: string;
  optional?: boolean;
};

const STEPS: Step[] = [
  {
    key: "incomeMonthly",
    title: "Сколько получу в этом месяце?",
    hint: "Зарплата и подработки — одной суммой.",
    placeholder: "100 000",
  },
  {
    key: "currentBalance",
    title: "Сколько сейчас на карте и счёте?",
    hint: "Деньги, которые уже у вас есть. Так расчёт «в день» будет точным.",
    placeholder: "45 000",
  },
  {
    key: "mandatoryMonthly",
    title: "Обязательные траты в месяц",
    hint: "Аренда, кредиты, ЖКХ, подписки — суммой.",
    placeholder: "40 000",
  },
  {
    key: "minimumBalance",
    title: "Подушка — что не трогаем",
    hint: "Неприкосновенный остаток на счёте. Можно оставить 0.",
    placeholder: "30 000",
    optional: true,
  },
];

const TOTAL = STEPS.length + 1; // + экран результата

/**
 * Пошаговый калькулятор (квиз): один вопрос на экран, простая логика,
 * в конце — результат и подсказка, что всё видно в личном кабинете.
 */
export function CalculatorQuiz({
  budget,
  onBudgetChange,
  result,
  onDone,
}: {
  budget: BudgetInput;
  onBudgetChange: (next: BudgetInput) => void;
  result: FinanceResult;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const isResult = step >= STEPS.length;

  const setField = (key: FieldKey, value: number) => onBudgetChange({ ...budget, [key]: value });
  const setPayday = (v: number) =>
    onBudgetChange({ ...budget, payday: v >= 1 && v <= 31 ? Math.round(v) : undefined });

  const next = () => setStep((s) => Math.min(STEPS.length, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const progress = Math.round(((isResult ? TOTAL : step + 1) / TOTAL) * 100);

  return (
    <div className="soft-card overflow-hidden p-5 sm:p-7">
      {/* Прогресс */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {isResult ? "Готово" : `${step + 1} / ${STEPS.length}`}
        </span>
      </div>

      {!isResult ? (
        <div key={step} className="animate-float-in">
          <div className="flex items-center gap-2 text-primary">
            <Wallet className="h-5 w-5" />
            <span className="text-xs font-medium uppercase tracking-wide">Ваши цифры</span>
          </div>
          <h2 className="mt-2 text-xl font-bold sm:text-2xl">
            {STEPS[step].title}
            {STEPS[step].optional && (
              <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
                (необязательно)
              </span>
            )}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{STEPS[step].hint}</p>

          <div className="mt-5">
            <div className="relative">
              <Input
                autoFocus
                type="number"
                inputMode="numeric"
                min={0}
                placeholder={STEPS[step].placeholder}
                value={budget[STEPS[step].key] || ""}
                onChange={(e) => setField(STEPS[step].key, Number(e.target.value) || 0)}
                onKeyDown={(e) => e.key === "Enter" && next()}
                className="h-14 pr-10 text-2xl font-bold"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
                ₽
              </span>
            </div>

            {/* День зарплаты — на шаге дохода */}
            {step === 0 && (
              <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-3.5">
                <label className="text-sm font-medium">
                  Когда приходит зарплата?{" "}
                  <span className="text-muted-foreground">(число месяца — необязательно)</span>
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  placeholder="например, 10"
                  value={budget.payday ?? ""}
                  onChange={(e) => setPayday(Number(e.target.value) || 0)}
                  className="mt-2 h-11 sm:w-40"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Укажете — посчитаем «сколько можно в день» честно от остатка до зарплаты.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={back} disabled={step === 0} className={cn(step === 0 && "invisible")}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Назад
            </Button>
            <Button onClick={next} size="lg" className="rounded-xl px-7">
              {step === STEPS.length - 1 ? "Посчитать" : "Далее"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="animate-float-in space-y-4">
          <PrimaryAnswer budget={budget} result={result} />

          {/* Подсказка про кабинет */}
          <div className="cabinet-glow rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 font-semibold">Готово! Это — ваш личный кабинет</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Все траты, доходы и аналитику (круг по категориям, сколько можно в день и до зарплаты) вы видите
              в личном кабинете. Записывайте траты — цифры пересчитываются сами.
            </p>
            <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
              <Button asChild className="rounded-xl">
                <Link href="/account">Открыть кабинет</Link>
              </Button>
              <Button variant="outline" onClick={onDone} className="rounded-xl">
                Показать детали расчёта
              </Button>
            </div>
          </div>

          <button
            type="button"
            onClick={back}
            className="mx-auto block text-sm text-muted-foreground hover:text-foreground"
          >
            ← Изменить цифры
          </button>
        </div>
      )}
    </div>
  );
}
