import type { PurchaseDecisionType, SafetyStatus } from "./types";
import { formatRub } from "@/lib/utils";

export function getFlowSafetyLabel(status: SafetyStatus): string {
  switch (status) {
    case "healthy":
      return "Поток из дохода в порядке";
    case "caution":
      return "Поток из дохода тонкий";
    case "danger":
      return "Доход не покрывает расходы";
  }
}

export function getReserveSafetyLabel(
  status: SafetyStatus,
  currentBalance: number,
  minimumBalance: number,
  balanceAfterMandatory?: number,
): string {
  if (minimumBalance <= 0) return "Резерв не задан";
  if (currentBalance < minimumBalance) {
    return `На счёте ниже минимума (${formatRub(minimumBalance)})`;
  }
  if (
    balanceAfterMandatory != null &&
    minimumBalance > 0 &&
    balanceAfterMandatory < minimumBalance
  ) {
    return "После обязательных платежей запас ниже минимума";
  }
  if (currentBalance >= minimumBalance) {
    return status === "healthy"
      ? "Запас на счёте в норме"
      : "Запас на счёте есть, но мало";
  }
  return `На счёте ниже минимума (${formatRub(minimumBalance)})`;
}

export function getSafetyStatusLabel(status: SafetyStatus): string {
  switch (status) {
    case "healthy":
      return "Бюджет в порядке";
    case "caution":
      return "Можно, но запас уже тонкий";
    case "danger":
      return "Сейчас лучше не трогать резерв";
  }
}

export function getAllocationSummary(
  status: SafetyStatus,
  availableForLife: number,
  minimumBalance: number,
): string {
  switch (status) {
    case "danger":
      return availableForLife <= 0
        ? "После обязательных трат и резерва свободных денег не остаётся. Сначала сократите расходы или увеличьте доход."
        : "На счёте не хватит на обязательные платежи с сохранением минимума. Нужен план по экономии.";
    case "caution":
      return `Можно распределить ${formatRub(availableForLife)} на жизнь в этом месяце. Держите на счёте минимум ${formatRub(minimumBalance)}.`;
    case "healthy":
      return `На жизнь остаётся ${formatRub(availableForLife)} в месяц. Минимум на счёте (${formatRub(minimumBalance)}) сохранится.`;
  }
}

function formatMonthsText(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} месяцев`;
  if (mod10 === 1) return `${count} месяц`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} месяца`;
  return `${count} месяцев`;
}

export function getSpendStatusPhrase(status: SafetyStatus): string {
  switch (status) {
    case "healthy":
      return "Можно тратить спокойно";
    case "caution":
      return "Запас ещё слабый — тратьте осторожно";
    case "danger":
      return "Сейчас лучше не тратить лишнего";
  }
}

/** Пояснение двух разных «лимитов на траты» */
export function getSpendAmountExplanation(
  freeBudgetMonthly: number,
  availableForLife: number,
  currentBalance: number,
): string {
  const fromBalance = Math.max(0, availableForLife - freeBudgetMonthly);
  if (currentBalance <= 0 || fromBalance <= 0) {
    return "Это сумма из вашего дохода после обязательных трат и копилки.";
  }
  return `Из дохода — ${formatRub(freeBudgetMonthly)} в месяц. Ещё ${formatRub(fromBalance)} можно потратить с текущего счёта (с учётом резерва).`;
}

export function getTotalLifeLabel(availableForLife: number, currentBalance: number): string {
  if (currentBalance > 0) {
    return `Всего на этот месяц (доход + счёт): ${formatRub(availableForLife)}`;
  }
  return `На жизнь в этом месяце: ${formatRub(availableForLife)}`;
}

export function getPurchaseShortVerdict(
  decision: PurchaseDecisionType,
  missingAmount: number,
  monthsToPurchase: number | null,
): string {
  switch (decision) {
    case "buy_now":
      return "Покупку можно делать";
    case "wait":
      return "Лучше подождать неделю";
    case "build_reserve":
      return "Покупка сейчас рискованна";
    case "defer":
      if (missingAmount > 0 && monthsToPurchase != null && monthsToPurchase > 0) {
        return `Не хватает ${formatRub(missingAmount)} — это ${formatMonthsText(monthsToPurchase)} накопления`;
      }
      if (missingAmount > 0) {
        return `Не хватает ${formatRub(missingAmount)}`;
      }
      return "Покупку лучше отложить";
  }
}

const DECISION_LABELS: Record<PurchaseDecisionType, string> = {
  buy_now: "Купить сейчас",
  wait: "Подождать 7 дней",
  defer: "Отложить",
  build_reserve: "Сначала собрать резерв",
};

export function getDecisionLabel(
  decision: PurchaseDecisionType,
  monthsToPurchase: number | null,
): string {
  if (decision === "defer" && monthsToPurchase != null && monthsToPurchase > 0) {
    return `Отложить на ${formatMonthsText(monthsToPurchase)}`;
  }
  return DECISION_LABELS[decision];
}

export function getPurchaseShortRule(
  decision: PurchaseDecisionType,
  params: {
    missingAmount: number;
    availableForPurchaseNow: number;
    minimumBalance: number;
    reserveAfterPurchase: number;
    monthsToPurchase: number | null;
  },
): string {
  const {
    missingAmount,
    availableForPurchaseNow,
    minimumBalance,
    reserveAfterPurchase,
    monthsToPurchase,
  } = params;

  switch (decision) {
    case "buy_now":
      return "Можно покупать — подушка и обязательные не пострадают.";
    case "wait":
      return "Покупка не срочная — подождите неделю, чтобы не пожалеть.";
    case "build_reserve":
      return `Покупка отложена: после неё подушка упадёт ниже ${formatRub(minimumBalance)}.`;
    case "defer":
      if (missingAmount > 0) {
        const wait =
          monthsToPurchase != null && monthsToPurchase > 0
            ? ` — накопите за ${formatMonthsText(monthsToPurchase)}.`
            : ".";
        return `Покупка отложена: не хватает ${formatRub(missingAmount)} (с карты безопасно ${formatRub(availableForPurchaseNow)})${wait}`;
      }
      return "Покупка отложена: сначала стабилизируйте бюджет.";
  }
}

export function getPurchaseExplanation(
  decision: PurchaseDecisionType,
  params: {
    missingAmount: number;
    monthsToPurchase: number | null;
    reserveAfterPurchase: number;
    minimumBalance: number;
    freeBudgetMonthly: number;
    availableForPurchaseNow: number;
    purchasePrice: number;
    savingsMonthly: number;
  },
): { explanation: string; nextStep: string } {
  const {
    missingAmount,
    monthsToPurchase,
    reserveAfterPurchase,
    minimumBalance,
    freeBudgetMonthly,
    availableForPurchaseNow,
    purchasePrice,
    savingsMonthly,
  } = params;

  switch (decision) {
    case "buy_now":
      return {
        explanation:
          "Покупка не бьёт по бюджету. После неё останется достаточный запас на счёте — можно покупать спокойно.",
        nextStep: "Проверьте, что обязательные платежи в этом месяце уже учтены.",
      };
    case "wait":
      return {
        explanation:
          "Покупка не срочная и не критичная. Подождите 7 дней — часто желание проходит или появляется лучшее предложение.",
        nextStep: "Запишите покупку и вернитесь к ней через неделю.",
      };
    case "build_reserve":
      return {
        explanation: `После покупки на счёте останется ${formatRub(Math.max(0, reserveAfterPurchase))} — это ниже вашего минимума ${formatRub(minimumBalance)}.`,
        nextStep: "Сначала пополните резерв до минимума, потом возвращайтесь к покупке.",
      };
    case "defer":
      if (missingAmount > 0 && freeBudgetMonthly <= 0) {
        return {
          explanation:
            "С карты не хватает на покупку, а из зарплаты на жизнь ничего не остаётся. Сначала стабилизируйте бюджет.",
          nextStep:
            "Сократите обязательные или отложения, либо увеличьте доход — затем вернитесь к покупке.",
        };
      }
      if (missingAmount > 0 && monthsToPurchase != null) {
        const monthlyNeeded = Math.ceil(missingAmount / monthsToPurchase);
        const leftForLife = Math.max(0, freeBudgetMonthly - monthlyNeeded);
        const savingsNote =
          savingsMonthly > 0
            ? ` (уже откладываете ${formatRub(savingsMonthly)}/мес на другие цели)`
            : "";
        const variantA =
          leftForLife > 0
            ? `Вариант А — копить ${formatRub(monthlyNeeded)}/мес ${formatMonthsText(monthsToPurchase)}: на жизнь из зарплаты останется ${formatRub(leftForLife)}/мес${savingsNote}.`
            : `Вариант А — копить ${formatRub(monthlyNeeded)}/мес ${formatMonthsText(monthsToPurchase)}: на жизнь из зарплаты не останется${savingsNote}.`;
        const variantB =
          freeBudgetMonthly > monthlyNeeded
            ? `Вариант Б — жить на ${formatRub(freeBudgetMonthly)}/мес: откладывайте меньше на покупку, срок станет длиннее.`
            : "";
        return {
          explanation: `С карты сейчас безопасно ${formatRub(availableForPurchaseNow)} из ${formatRub(purchasePrice)}. Не хватает ${formatRub(missingAmount)}.`,
          nextStep: [
            `Сейчас с карты: ${formatRub(availableForPurchaseNow)}. Нужно накопить: ${formatRub(missingAmount)}.`,
            "",
            variantA,
            variantB ? "" : "",
            variantB,
          ]
            .filter(Boolean)
            .join("\n"),
        };
      }
      if (availableForPurchaseNow <= 0) {
        return {
          explanation:
            "Обязательные платежи и минимум на счёте занимают текущий баланс. Покупку лучше планировать из следующего дохода.",
          nextStep: "Дождитесь дохода или накопите на покупку из свободного месячного потока.",
        };
      }
      return {
        explanation: "Покупка создаст финансовое напряжение. Лучше отложить и сначала укрепить бюджет.",
        nextStep: "Проверьте обязательные траты и резерв, затем решите снова.",
      };
  }
}
