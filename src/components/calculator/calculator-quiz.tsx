"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Wallet, Sparkles, PiggyBank, ShoppingCart, Save, Target, Lightbulb } from "lucide-react";
import type { BudgetInput, FinanceResult, PurchaseInput, SavingsGoalInput } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrimaryAnswer } from "@/components/calculator/primary-answer";
import { formatRub, cn } from "@/lib/utils";

type FieldKey = "incomeMonthly" | "currentBalance" | "mandatoryMonthly" | "minimumBalance";

type Step = { key: FieldKey; title: string; hint: string; placeholder: string; optional?: boolean };

const STEPS: Step[] = [
  { key: "incomeMonthly", title: "Сколько получу в этом месяце?", hint: "Зарплата и подработки — одной суммой.", placeholder: "100 000" },
  { key: "currentBalance", title: "Сколько сейчас на карте и счёте?", hint: "Деньги, которые уже у вас есть. Так расчёт «в день» будет точным.", placeholder: "45 000" },
  { key: "mandatoryMonthly", title: "Обязательные траты в месяц", hint: "Аренда, кредиты, ЖКХ, подписки — суммой.", placeholder: "40 000" },
  { key: "minimumBalance", title: "Подушка — что не трогаем", hint: "Неприкосновенный остаток на счёте. Можно оставить 0.", placeholder: "30 000", optional: true },
];

const GOAL_STEP = STEPS.length; // цель накопления
const PURCHASE_STEP = STEPS.length + 1; // крупная покупка
const RESULT_STEP = STEPS.length + 2;
const TOTAL = STEPS.length + 3;

const pluralMonths = (n: number) =>
  n % 10 === 1 && n % 100 !== 11
    ? "месяц"
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? "месяца"
      : "месяцев";

/**
 * Пошаговый калькулятор (квиз). Цель и покупка спрашивают сумму + взнос/мес
 * с рекомендацией от бюджета; «на жизнь» = свободно − взнос_на_цель − взнос_на_покупку.
 */
export function CalculatorQuiz({
  budget,
  purchase,
  savingsGoal,
  onBudgetChange,
  onPurchaseChange,
  onSavingsGoalChange,
  result,
  onDone,
  onSave,
}: {
  budget: BudgetInput;
  purchase: PurchaseInput;
  savingsGoal: SavingsGoalInput;
  onBudgetChange: (next: BudgetInput) => void;
  onPurchaseChange: (next: PurchaseInput) => void;
  onSavingsGoalChange: (next: SavingsGoalInput) => void;
  result: FinanceResult;
  onDone: () => void;
  onSave: () => Promise<void>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const isGoal = step === GOAL_STEP;
  const isPurchase = step === PURCHASE_STEP;
  const isResult = step === RESULT_STEP;
  const isInput = step < GOAL_STEP;

  // взносы по статьям
  const goalMonthly = savingsGoal.monthlyContribution ?? 0;
  const purchaseMonthly = purchase.monthlyContribution ?? 0;

  const free = result.core.remainingAfterMandatory; // доход − обязательные
  const totalContrib = goalMonthly + purchaseMonthly;
  const afterSavings = free - totalContrib; // на жизнь после взносов
  const cashNow = Math.max(0, budget.currentBalance - budget.minimumBalance);

  const setField = (key: FieldKey, value: number) => onBudgetChange({ ...budget, [key]: value });
  const setPayday = (v: number) => onBudgetChange({ ...budget, payday: v >= 1 && v <= 31 ? Math.round(v) : undefined });
  const setGoalName = (name: string) => onSavingsGoalChange({ ...savingsGoal, goalName: name });
  const setGoalTarget = (v: number) => onSavingsGoalChange({ ...savingsGoal, targetAmount: v });
  // меняем взнос И синхронизируем общую сумму откладывания (бюджет учитывает обе траты)
  const setGoalMonthly = (v: number) => {
    onSavingsGoalChange({ ...savingsGoal, monthlyContribution: v });
    onBudgetChange({ ...budget, savingsMonthly: v + purchaseMonthly });
  };
  const setPrice = (v: number) => onPurchaseChange({ ...purchase, price: v });
  const setPurchaseMonthly = (v: number) => {
    onPurchaseChange({ ...purchase, monthlyContribution: v });
    onBudgetChange({ ...budget, savingsMonthly: goalMonthly + v });
  };

  /** Рекомендованный взнос: накопить за ~год, но не больше 25% свободного (с учётом другого взноса). */
  const recommend = (amount: number, otherContrib: number) => {
    const room = Math.max(0, free - otherContrib);
    if (room <= 0 || amount <= 0) return 0;
    const cap = Math.round(room * 0.6); // не «съедаем» весь остаток
    return Math.max(0, Math.min(Math.ceil(amount / 12), cap, amount));
  };

  const next = () => setStep((s) => Math.min(RESULT_STEP, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const stepNo = Math.min(step + 1, TOTAL);
  const progress = Math.round((stepNo / TOTAL) * 100);

  // покупка
  const price = purchase.price;
  const gap = Math.max(0, price - cashNow);
  const canBuyNow = price > 0 && gap === 0;
  const purchaseMonths = gap > 0 && purchaseMonthly > 0 ? Math.ceil(gap / purchaseMonthly) : 0;
  const goalMonths = savingsGoal.targetAmount > 0 && goalMonthly > 0 ? Math.ceil(savingsGoal.targetAmount / goalMonthly) : 0;
  const recGoal = recommend(savingsGoal.targetAmount, purchaseMonthly);
  const recPurchase = recommend(gap || price, goalMonthly);

  const moneyInput = (props: {
    autoFocus?: boolean;
    placeholder: string;
    value: number;
    onChange: (v: number) => void;
    big?: boolean;
    onEnter?: () => void;
  }) => (
    <div className="relative">
      <Input
        autoFocus={props.autoFocus}
        type="number"
        inputMode="numeric"
        min={0}
        placeholder={props.placeholder}
        value={props.value || ""}
        onChange={(e) => props.onChange(Number(e.target.value) || 0)}
        onKeyDown={(e) => e.key === "Enter" && props.onEnter?.()}
        className={cn("pr-10", props.big ? "h-14 text-2xl font-bold" : "h-12 text-base")}
      />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">₽</span>
    </div>
  );

  const recChip = (rec: number, apply: () => void) =>
    rec > 0 ? (
      <button
        type="button"
        onClick={apply}
        className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
      >
        <Lightbulb className="h-3.5 w-3.5" /> Рекомендуем {formatRub(rec)}/мес
      </button>
    ) : null;

  return (
    <div className="soft-card overflow-hidden p-5 sm:p-7">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{isResult ? "Готово" : `${stepNo} / ${TOTAL - 1}`}</span>
      </div>

      {isInput && (
        <div key={step} className="animate-float-in">
          <div className="flex items-center gap-2 text-primary">
            <Wallet className="h-5 w-5" />
            <span className="text-xs font-medium uppercase tracking-wide">Ваши цифры</span>
          </div>
          <h2 className="mt-2 text-xl font-bold sm:text-2xl">
            {STEPS[step].title}
            {STEPS[step].optional && <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">(необязательно)</span>}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{STEPS[step].hint}</p>

          <div className="mt-5">
            {moneyInput({
              autoFocus: true,
              placeholder: STEPS[step].placeholder,
              value: budget[STEPS[step].key],
              onChange: (v) => setField(STEPS[step].key, v),
              big: true,
              onEnter: next,
            })}

            {step === 0 && (
              <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-3.5">
                <label className="text-sm font-medium">
                  Когда приходит зарплата? <span className="text-muted-foreground">(число месяца — необязательно)</span>
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
          {renderNav()}
        </div>
      )}

      {isGoal && (
        <div key="goal" className="animate-float-in">
          <div className="flex items-center gap-2 text-primary">
            <Target className="h-5 w-5" />
            <span className="text-xs font-medium uppercase tracking-wide">Цель</span>
          </div>
          <h2 className="mt-2 text-xl font-bold sm:text-2xl">
            Копите на что-то конкретное?
            <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">(необязательно)</span>
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Цель, сколько нужно всего и сколько готовы откладывать в месяц.</p>
          <div className="mt-5 space-y-3">
            <Input autoFocus placeholder="Например: отпуск, ремонт" value={savingsGoal.goalName || ""} onChange={(e) => setGoalName(e.target.value)} className="h-12 text-base" />
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Сколько нужно всего</p>
              {moneyInput({ placeholder: "120 000", value: savingsGoal.targetAmount, onChange: setGoalTarget })}
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Готов откладывать в месяц</p>
              {moneyInput({ placeholder: "10 000", value: goalMonthly, onChange: setGoalMonthly, onEnter: next })}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {recChip(recGoal, () => setGoalMonthly(recGoal))}
                {goalMonths > 0 && <span className="text-xs text-muted-foreground">≈ {goalMonths} {pluralMonths(goalMonths)} до цели</span>}
              </div>
            </div>
          </div>
          {renderNav()}
        </div>
      )}

      {isPurchase && (
        <div key="purchase" className="animate-float-in">
          <div className="flex items-center gap-2 text-primary">
            <ShoppingCart className="h-5 w-5" />
            <span className="text-xs font-medium uppercase tracking-wide">Крупная покупка</span>
          </div>
          <h2 className="mt-2 text-xl font-bold sm:text-2xl">
            Планируете крупную покупку?
            <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">(необязательно)</span>
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Цена и сколько готовы откладывать в месяц на неё.</p>
          <div className="mt-5 space-y-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Цена покупки</p>
              {moneyInput({ autoFocus: true, placeholder: "80 000", value: price, onChange: setPrice, big: true })}
            </div>
            {price > 0 && !canBuyNow && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Готов откладывать в месяц</p>
                {moneyInput({ placeholder: "10 000", value: purchaseMonthly, onChange: setPurchaseMonthly, onEnter: next })}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {recChip(recPurchase, () => setPurchaseMonthly(recPurchase))}
                  {purchaseMonths > 0 && <span className="text-xs text-muted-foreground">≈ {purchaseMonths} {pluralMonths(purchaseMonths)} до покупки</span>}
                </div>
              </div>
            )}
            {price > 0 && canBuyNow && (
              <p className="text-sm text-[hsl(var(--success))]">🟢 Хватает на счёте — копить не нужно.</p>
            )}
          </div>
          {renderNav("Посчитать")}
        </div>
      )}

      {isResult && (
        <div className="animate-float-in space-y-4">
          <PrimaryAnswer budget={budget} result={result} />

          {/* Взносы и «на жизнь» */}
          {totalContrib > 0 && (
            <div className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm", afterSavings < 0 ? "surface-warning" : "surface-success")}>
              <PiggyBank className="mt-0.5 h-5 w-5 shrink-0" />
              {afterSavings < 0 ? (
                <p>
                  Взносы (цель + покупка) — <b>{formatRub(totalContrib)}/мес</b>, но свободно только <b>{formatRub(free)}</b>. На жизнь не
                  хватит — уменьшите взносы примерно до <b>{formatRub(Math.max(0, Math.round(free * 0.4)))}/мес</b>.
                </p>
              ) : (
                <p>
                  Откладываете на цель и покупку <b>{formatRub(totalContrib)}/мес</b>. На жизнь после этого остаётся{" "}
                  <b>{formatRub(afterSavings)}/мес</b> (≈ {formatRub(Math.round(afterSavings / 30))}/день).
                </p>
              )}
            </div>
          )}

          {/* Цель */}
          {savingsGoal.targetAmount > 0 && (
            <div className="surface-success flex items-start gap-3 rounded-xl border p-4 text-sm">
              <Target className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Цель {savingsGoal.goalName ? <b>«{savingsGoal.goalName}»</b> : "накопления"}: <b>{formatRub(savingsGoal.targetAmount)}</b>.
                {goalMonthly > 0
                  ? ` Откладывая ${formatRub(goalMonthly)}/мес — за ${goalMonths} ${pluralMonths(goalMonths)}.`
                  : " Укажите взнос/мес, чтобы посчитать срок."}
              </p>
            </div>
          )}

          {/* Покупка */}
          {price > 0 && (
            <div className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm", canBuyNow ? "surface-success" : "surface-warning")}>
              <ShoppingCart className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                {canBuyNow
                  ? `🟢 Покупку ${formatRub(price)} можно позволить сейчас — хватает на счёте, подушка ${formatRub(budget.minimumBalance)} остаётся. Останется ${formatRub(cashNow - price)}.`
                  : purchaseMonthly > 0
                    ? `🟡 Не хватает ${formatRub(gap)} (на счёте доступно ${formatRub(cashNow)}). Откладывая ${formatRub(purchaseMonthly)}/мес — за ${purchaseMonths} ${pluralMonths(purchaseMonths)}.`
                    : `🟡 Не хватает ${formatRub(gap)} (на счёте доступно ${formatRub(cashNow)}). Укажите взнос/мес — посчитаю срок.`}
              </p>
            </div>
          )}

          <div className="cabinet-glow rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 font-semibold">Готово! Это — ваш личный кабинет</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Аналитику (круг по категориям, сколько можно в день и до зарплаты), цель и покупку вы видите в кабинете.
              Записывайте траты — цифры пересчитываются сами.
            </p>
            <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
              <Button onClick={saveAndOpen} disabled={saving} size="lg" className="rounded-xl px-7">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Сохраняем…" : "Сохранить и открыть кабинет"}
              </Button>
              <Button variant="outline" size="lg" onClick={onDone} className="rounded-xl">
                Показать детали
              </Button>
            </div>
          </div>

          <button type="button" onClick={() => setStep(0)} className="mx-auto block text-sm text-muted-foreground hover:text-foreground">
            ← Изменить цифры
          </button>
        </div>
      )}
    </div>
  );

  async function saveAndOpen() {
    setSaving(true);
    try {
      await onSave();
    } catch {
      /* сохранено локально — продолжаем */
    }
    router.push("/account");
  }

  function renderNav(nextLabel = "Далее") {
    return (
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={back} disabled={step === 0} className={cn(step === 0 && "invisible")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Назад
        </Button>
        <Button onClick={next} size="lg" className="rounded-xl px-7">
          {nextLabel}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    );
  }
}
