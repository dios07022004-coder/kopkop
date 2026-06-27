"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Wallet, Sparkles, PiggyBank, ShoppingCart, Save, Target } from "lucide-react";
import type { BudgetInput, FinanceResult, PurchaseInput, SavingsGoalInput } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrimaryAnswer } from "@/components/calculator/primary-answer";
import { formatRub } from "@/lib/utils";
import { cn } from "@/lib/utils";

type FieldKey = "incomeMonthly" | "currentBalance" | "mandatoryMonthly" | "savingsMonthly" | "minimumBalance";

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
    key: "savingsMonthly",
    title: "Сколько откладывать каждый месяц?",
    hint: "На накопления и цели. Эта сумма не идёт в траты. Можно 0.",
    placeholder: "10 000",
    optional: true,
  },
  {
    key: "minimumBalance",
    title: "Подушка — что не трогаем",
    hint: "Неприкосновенный остаток на счёте. Можно оставить 0.",
    placeholder: "30 000",
    optional: true,
  },
];

const GOAL_STEP = STEPS.length; // шаг цели накопления
const PURCHASE_STEP = STEPS.length + 1; // шаг покупки
const RESULT_STEP = STEPS.length + 2; // экран результата
const TOTAL = STEPS.length + 3;

const pluralMonths = (n: number) =>
  n % 10 === 1 && n % 100 !== 11
    ? "месяц"
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? "месяца"
      : "месяцев";

/**
 * Пошаговый калькулятор (квиз): доход (+день зарплаты), счёт, обязательные,
 * накопления, подушка, планируемая покупка — авто-пересчёт. В конце — результат
 * и переход в личный кабинет.
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

  const saveAndOpen = async () => {
    setSaving(true);
    try {
      await onSave();
    } catch {
      /* расчёт всё равно сохранён локально — продолжаем */
    }
    router.push("/account");
  };
  const isPurchase = step === PURCHASE_STEP;
  const isResult = step === RESULT_STEP;
  const isInput = step < GOAL_STEP;

  const setField = (key: FieldKey, value: number) => onBudgetChange({ ...budget, [key]: value });
  const setPayday = (v: number) =>
    onBudgetChange({ ...budget, payday: v >= 1 && v <= 31 ? Math.round(v) : undefined });
  const setPrice = (v: number) => onPurchaseChange({ ...purchase, price: v });
  const setGoalName = (name: string) => onSavingsGoalChange({ ...savingsGoal, goalName: name });
  const setGoalTarget = (v: number) => onSavingsGoalChange({ ...savingsGoal, targetAmount: v });

  const next = () => setStep((s) => Math.min(RESULT_STEP, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const stepNo = Math.min(step + 1, TOTAL);
  const progress = Math.round((stepNo / TOTAL) * 100);

  // якорь и производные для подсказок результата
  const free = result.core.remainingAfterMandatory; // доход − обязательные
  const afterSavings = result.core.freeBudgetMonthly; // доход − обязательные − откладываю
  const price = purchase.price;
  // Покупка считается честно: можно ли купить с наличных (счёт − подушка),
  // а копить — по реальной сумме откладывания, а не по всему бюджету «на жизнь».
  const cashNow = Math.max(0, budget.currentBalance - budget.minimumBalance);
  const saveRate = budget.savingsMonthly > 0 ? budget.savingsMonthly : 0;
  const gap = Math.max(0, price - cashNow);
  const canBuyNow = price > 0 && gap === 0;
  const months = gap > 0 && saveRate > 0 ? Math.ceil(gap / saveRate) : 0;

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
          {isResult ? "Готово" : `${stepNo} / ${TOTAL - 1}`}
        </span>
      </div>

      {isInput && (
        <div key={step} className="animate-float-in">
          <div className="flex items-center gap-2 text-primary">
            <Wallet className="h-5 w-5" />
            <span className="text-xs font-medium uppercase tracking-wide">Ваши цифры</span>
          </div>
          <h2 className="mt-2 text-xl font-bold sm:text-2xl">
            {STEPS[step].title}
            {STEPS[step].optional && (
              <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">(необязательно)</span>
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
          <p className="mt-1.5 text-sm text-muted-foreground">
            Назовите цель и сколько нужно всего — покажем прогресс и срок в кабинете.
          </p>
          <div className="mt-5 space-y-3">
            <Input
              autoFocus
              placeholder="Например: отпуск, новый телефон"
              value={savingsGoal.goalName || ""}
              onChange={(e) => setGoalName(e.target.value)}
              className="h-12 text-base"
            />
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Сколько нужно всего, ₽"
                value={savingsGoal.targetAmount || ""}
                onChange={(e) => setGoalTarget(Number(e.target.value) || 0)}
                onKeyDown={(e) => e.key === "Enter" && next()}
                className="h-12 pr-10 text-base"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₽
              </span>
            </div>
          </div>
          {renderNav()}
        </div>
      )}

      {isPurchase && (
        <div key="purchase" className="animate-float-in">
          <div className="flex items-center gap-2 text-primary">
            <ShoppingCart className="h-5 w-5" />
            <span className="text-xs font-medium uppercase tracking-wide">Покупка</span>
          </div>
          <h2 className="mt-2 text-xl font-bold sm:text-2xl">
            Планируете крупную покупку?
            <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">(необязательно)</span>
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Введите цену — посчитаем, можно ли позволить сейчас или за сколько накопить.
          </p>
          <div className="mt-5 relative">
            <Input
              autoFocus
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="например, 80 000"
              value={purchase.price || ""}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              onKeyDown={(e) => e.key === "Enter" && next()}
              className="h-14 pr-10 text-2xl font-bold"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
              ₽
            </span>
          </div>
          {renderNav("Посчитать")}
        </div>
      )}

      {isResult && (
        <div className="animate-float-in space-y-4">
          <PrimaryAnswer budget={budget} result={result} />

          {/* Накопления */}
          {budget.savingsMonthly > 0 && (
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-sm",
                afterSavings < 0 ? "surface-warning" : "surface-success",
              )}
            >
              <PiggyBank className="mt-0.5 h-5 w-5 shrink-0" />
              {afterSavings < 0 ? (
                <p>
                  Вы откладываете <b>{formatRub(budget.savingsMonthly)}/мес</b>, но свободно только{" "}
                  <b>{formatRub(free)}</b> — на жизнь не хватит. Уменьшите сумму откладывания примерно до{" "}
                  <b>{formatRub(Math.max(0, Math.round(free * 0.2)))}/мес</b>.
                </p>
              ) : (
                <p>
                  Откладываете <b>{formatRub(budget.savingsMonthly)}/мес</b>. На жизнь после этого остаётся{" "}
                  <b>{formatRub(afterSavings)}/мес</b>.
                </p>
              )}
            </div>
          )}

          {/* Цель накопления */}
          {savingsGoal.targetAmount > 0 && (
            <div className="surface-success flex items-start gap-3 rounded-xl border p-4 text-sm">
              <Target className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Цель {savingsGoal.goalName ? <b>«{savingsGoal.goalName}»</b> : "накопления"}:{" "}
                <b>{formatRub(savingsGoal.targetAmount)}</b>.
                {budget.savingsMonthly > 0
                  ? ` Откладывая по ${formatRub(budget.savingsMonthly)}/мес — накопите за ${Math.ceil(savingsGoal.targetAmount / budget.savingsMonthly)} ${pluralMonths(Math.ceil(savingsGoal.targetAmount / budget.savingsMonthly))}.`
                  : " Укажите на шаге «откладывать в месяц», сколько копите — посчитаю срок."}
              </p>
            </div>
          )}

          {/* Покупка — честный расчёт: наличные сейчас + реальная сумма откладывания */}
          {price > 0 && (
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-sm",
                canBuyNow ? "surface-success" : "surface-warning",
              )}
            >
              <ShoppingCart className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                {canBuyNow
                  ? `🟢 Покупку ${formatRub(price)} можно позволить сейчас — хватает на счёте, подушка ${formatRub(budget.minimumBalance)} остаётся. После покупки на счёте будет ${formatRub(cashNow - price)}.`
                  : saveRate > 0
                    ? `🟡 Не хватает ${formatRub(gap)} (на счёте доступно ${formatRub(cashNow)}). Откладывая по ${formatRub(saveRate)}/мес — накопите за ${months} ${pluralMonths(months)}.`
                    : `🟡 Не хватает ${formatRub(gap)} (на счёте доступно ${formatRub(cashNow)}). Укажите на шаге «откладывать в месяц», сколько можете копить — посчитаю срок.`}
              </p>
            </div>
          )}

          {/* Подсказка про кабинет */}
          <div className="cabinet-glow rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 font-semibold">Готово! Это — ваш личный кабинет</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Все траты, доходы и аналитику (круг по категориям, сколько можно в день и до зарплаты) вы видите
              в личном кабинете. Записывайте траты — цифры пересчитываются сами.
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
            <p className="mt-2 text-xs text-muted-foreground">
              Расчёт сохранится как шаблон — в кабинете увидите аналитику по нему и сможете вести траты.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setStep(0)}
            className="mx-auto block text-sm text-muted-foreground hover:text-foreground"
          >
            ← Изменить цифры
          </button>
        </div>
      )}
    </div>
  );

  function renderNav(nextLabel = "Далее") {
    const isLastInput = step === PURCHASE_STEP;
    return (
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={back} disabled={step === 0} className={cn(step === 0 && "invisible")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Назад
        </Button>
        <Button onClick={next} size="lg" className="rounded-xl px-7">
          {isLastInput ? nextLabel : nextLabel}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    );
  }
}
