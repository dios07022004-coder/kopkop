import type { BudgetInput, FinanceResult, PurchaseInput, SavingsGoalInput } from "@/lib/finance";

/**
 * Выгрузка плана в структурированный Excel-файл (.xlsx) с разделами,
 * подписями и пояснениями. Открывается в Excel и Google Sheets.
 * xlsx грузится динамически — не попадает в основной бандл.
 */
export async function downloadPlanXlsx(
  budget: BudgetInput,
  result: FinanceResult,
  opts?: { savingsGoal?: SavingsGoalInput; purchase?: PurchaseInput; dateLabel?: string },
) {
  const XLSX = await import("xlsx");
  const { core } = result;
  const free = core.remainingAfterMandatory;
  const perDay = Math.max(0, Math.round(free / 30));

  type Row = (string | number)[];
  const rows: Row[] = [];

  rows.push(["Деньги под контролем — мой финансовый план"]);
  rows.push([`Дата: ${opts?.dateLabel ?? new Date().toLocaleDateString("ru-RU")}`]);
  rows.push([]);

  rows.push(["ВАШИ ДАННЫЕ", "Сумма, ₽", "Пояснение"]);
  rows.push(["Доход за месяц", budget.incomeMonthly, "Зарплата и подработки одной суммой"]);
  rows.push(["На счёте сейчас", budget.currentBalance, "Деньги, которые уже лежат на счёте"]);
  rows.push(["Обязательные траты", budget.mandatoryMonthly, "Аренда, кредиты, коммуналка"]);
  rows.push(["Подушка (минимум на счёте)", budget.minimumBalance, "Неприкосновенный остаток"]);
  rows.push([]);

  rows.push(["ГЛАВНЫЙ РЕЗУЛЬТАТ", "Сумма, ₽", "Пояснение"]);
  rows.push(["Свободно на жизнь", free, "Доход − обязательные траты"]);
  rows.push(["В день", perDay, "Свободно ÷ 30 дней"]);
  rows.push([
    "Состояние счёта",
    budget.currentBalance >= budget.minimumBalance ? "В порядке" : "Ниже подушки",
    `На счёте ${budget.currentBalance} ₽ · подушка ${budget.minimumBalance} ₽`,
  ]);
  rows.push([]);

  // Куда тратить — распределение свободных денег
  const cats = budget.categories ?? [];
  const totalPct = cats.reduce((s, c) => s + c.percent, 0) || 100;
  if (cats.length > 0 && free > 0) {
    rows.push(["КУДА ТРАТИТЬ (распределение)", "Сумма, ₽", "Доля"]);
    for (const c of cats) {
      rows.push([c.label, Math.round((free * c.percent) / totalPct), `${c.percent}%`]);
    }
    rows.push([]);
  }

  // Накопления
  const goal = opts?.savingsGoal;
  const sg = result.savingsGoal;
  if (goal && goal.targetAmount > 0 && sg) {
    const setAside = sg.effectiveContribution;
    rows.push(["НАКОПЛЕНИЯ", "Значение", "Пояснение"]);
    rows.push(["Цель", goal.goalName || "Цель", `Сумма цели: ${goal.targetAmount} ₽`]);
    rows.push(["Уже накоплено", goal.currentSaved, ""]);
    rows.push(["Откладывать в месяц", setAside, "Из свободных денег"]);
    rows.push(["Останется на жизнь", Math.max(0, free - setAside), "Свободно − взнос"]);
    if (sg.monthsToGoal != null) rows.push(["Срок", `${sg.monthsToGoal} мес`, ""]);
    rows.push([]);
  }

  // Покупка
  const purchase = opts?.purchase;
  if (purchase && purchase.price > 0) {
    const fits = purchase.price <= free;
    rows.push(["ПОКУПКА", "Значение", "Пояснение"]);
    rows.push(["Цена", purchase.price, ""]);
    rows.push([
      "Решение",
      fits ? "Можно купить" : "Копить",
      fits
        ? `После покупки на жизнь останется ${free - purchase.price} ₽`
        : `Не хватает ${purchase.price - free} ₽ из свободных денег`,
    ]);
    rows.push([]);
  }

  rows.push(["Это рекомендация на основе ваших цифр, не финансовая консультация."]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 34 }, { wch: 18 }, { wch: 40 }];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Мой бюджет");
  XLSX.writeFile(wb, "moy-byudzhet.xlsx");
}
