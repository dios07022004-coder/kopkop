import { formatRub } from "@/lib/utils";
import type { BudgetInput, FinanceResult } from "@/lib/finance";

/**
 * Формирует CSV с готовой структурой плана и скачивает его.
 * Открывается в Excel и Google Sheets. BOM — чтобы кириллица не «ломалась» в Excel.
 */
export function downloadPlanCsv(budget: BudgetInput, result: FinanceResult) {
  const { core, allocation } = result;
  const rows: (string | number)[][] = [
    ["Деньги под контролем — мой расчёт", ""],
    ["", ""],
    ["Показатель", "Сумма, ₽"],
    ["Доход за месяц", budget.incomeMonthly],
    ["Обязательные траты", budget.mandatoryMonthly],
    ["Свободно на жизнь (доход − обязательные)", core.remainingAfterMandatory],
    ["На счёте сейчас", budget.currentBalance],
    ["Подушка (минимум на счёте)", budget.minimumBalance],
    ["", ""],
    ["Распределение свободных денег", ""],
  ];

  for (const a of allocation.allocations) {
    rows.push([a.label, Math.round((core.remainingAfterMandatory * a.percent) / 100)]);
  }

  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell);
          return s.includes(";") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(";"),
    )
    .join("\r\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "moy-byudzhet.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export { formatRub };
