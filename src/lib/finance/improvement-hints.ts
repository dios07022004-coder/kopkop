import { formatRub } from "@/lib/utils";
import { computeBudgetCore } from "./core";
import { decidePurchase } from "./purchase-decision";
import { parsePurchaseInput } from "./normalize";
import { formatMonthsText } from "./savings-copy";
import type { BudgetInput, FinanceResult, PurchaseInput, SavingsGoalInput } from "./types";

export interface ImprovementHint {
  id: string;
  text: string;
}

const MANDATORY_DELTA = 5_000;
const INCOME_DELTA = 10_000;
const CUSHION_DELTA = 5_000;

/** Actionable hints — all via computeFinance / computeBudgetCore, no UI formulas */
export function buildImprovementHints(
  budget: BudgetInput,
  result: FinanceResult,
  purchase: Partial<PurchaseInput> | undefined,
  savingsGoal: SavingsGoalInput | undefined,
  options: { buying: boolean; purchasePrice: number },
): ImprovementHint[] {
  const hints: ImprovementHint[] = [];
  const { core } = result;
  const p = result.purchase;

  if (options.buying && p && options.purchasePrice > 0) {
    if (p.missingAmount > 0) {
      hints.push({
        id: "purchase-gap",
        text: `Чтобы купить сейчас, нужно ещё ${formatRub(p.missingAmount)} на счёте (с карты безопасно ${formatRub(core.availableForPurchaseNow)}).`,
      });
      if (p.monthsToPurchase != null && p.monthsToPurchase > 0) {
        hints.push({
          id: "purchase-wait",
          text: `Если перенести покупку на ${formatMonthsText(p.monthsToPurchase)}, накопите ${formatRub(p.missingAmount)} из зарплаты без риска для подушки.`,
        });
      }
    }

    if (p.decision === "build_reserve") {
      const gap = Math.max(0, budget.minimumBalance - p.reserveAfterPurchase);
      hints.push({
        id: "reserve-gap",
        text: `Пополните подушку на ${formatRub(gap)} — тогда покупка не опустит счёт ниже минимума.`,
      });
    }
  }

  if (core.availableForPurchaseNow <= 0 && budget.mandatoryMonthly > MANDATORY_DELTA) {
    const reduced = computeBudgetCore({
      ...budget,
      mandatoryMonthly: budget.mandatoryMonthly - MANDATORY_DELTA,
    });
    if (reduced.availableForPurchaseNow > core.availableForPurchaseNow) {
      hints.push({
        id: "cut-mandatory",
        text: `Если сократить обязательные на ${formatRub(MANDATORY_DELTA)}, с карты безопасно станет ${formatRub(reduced.availableForPurchaseNow)}.`,
      });
    }
  }

  if (budget.incomeMonthly > 0) {
    const boosted = computeBudgetCore({
      ...budget,
      incomeMonthly: budget.incomeMonthly + INCOME_DELTA,
    });
    if (
      boosted.freeBudgetMonthly > core.freeBudgetMonthly ||
      boosted.availableForPurchaseNow > core.availableForPurchaseNow
    ) {
      hints.push({
        id: "boost-income",
        text: `Если доход вырастет на ${formatRub(INCOME_DELTA)}, лимит из зарплаты станет ${formatRub(boosted.freeBudgetMonthly)}/мес, с карты — ${formatRub(boosted.availableForPurchaseNow)}.`,
      });
    }
  }

  if (
    budget.minimumBalance > CUSHION_DELTA &&
    budget.currentBalance < budget.minimumBalance + CUSHION_DELTA
  ) {
    const lowerCushion = computeBudgetCore({
      ...budget,
      minimumBalance: budget.minimumBalance - CUSHION_DELTA,
    });
    if (lowerCushion.availableForPurchaseNow > core.availableForPurchaseNow) {
      hints.push({
        id: "lower-cushion",
        text: `Если подушка будет ${formatRub(budget.minimumBalance - CUSHION_DELTA)} (минус ${formatRub(CUSHION_DELTA)}), с карты безопасно ${formatRub(lowerCushion.availableForPurchaseNow)} — но запас станет тоньше.`,
      });
    }
  }

  if (options.buying && options.purchasePrice > 0 && p?.decision === "defer") {
    const cheaperPrice = Math.max(0, options.purchasePrice - 10_000);
    const cheaperDecision = decidePurchase(
      core,
      parsePurchaseInput({ ...purchase, price: cheaperPrice }),
      budget.minimumBalance,
      budget.currentBalance,
      { savingsMonthly: budget.savingsMonthly },
    );
    if (cheaperDecision.decision === "buy_now") {
      hints.push({
        id: "cheaper-purchase",
        text: `Если снизить цену покупки на ${formatRub(10_000)}, можно купить сейчас без риска.`,
      });
    }
  }

  return hints.slice(0, 5);
}

export type PlanConfidence = "high" | "medium" | "low";

export function assessPlanConfidence(budget: BudgetInput): {
  level: PlanConfidence;
  label: string;
  explain: string;
  checks: string[];
} {
  const checks: string[] = [];

  if (budget.incomeMonthly > 0) {
    checks.push(`Доход: ${formatRub(budget.incomeMonthly)}`);
  }
  if (budget.currentBalance >= 0) {
    checks.push(`Счёт: ${formatRub(budget.currentBalance)}`);
  }
  if (budget.mandatoryMonthly > 0) {
    checks.push(`Обязательные: ${formatRub(budget.mandatoryMonthly)}`);
  }
  if (budget.minimumBalance >= 0) {
    checks.push(`Подушка: ${formatRub(budget.minimumBalance)}`);
  }

  if (budget.incomeMonthly <= 0 && budget.currentBalance <= 0) {
    return {
      level: "low",
      label: "Мало данных",
      explain: "Укажите доход или сумму на счёте.",
      checks,
    };
  }
  if (
    budget.incomeMonthly > 0 &&
    budget.mandatoryMonthly > budget.incomeMonthly
  ) {
    return {
      level: "low",
      label: "Сценарий напряжённый",
      explain: "Обязательные больше дохода — проверьте цифры.",
      checks,
    };
  }
  if (budget.incomeMonthly <= 0 || budget.mandatoryMonthly <= 0) {
    return {
      level: "medium",
      label: "Средняя точность",
      explain: "Добавьте доход и обязательные — ответ станет точнее.",
      checks,
    };
  }
  checks.push("Формулы: лимит месяца, зарплата, карта — из одного ядра");
  return {
    level: "high",
    label: "Данные полные",
    explain: "Все ключевые поля заполнены, расчёт по полным формулам.",
    checks,
  };
}
