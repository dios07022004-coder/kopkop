import { buildBreakdown } from "@/lib/finance";
import type { BudgetInput, FinanceResult, PurchaseInput, SavingsGoalInput } from "@/lib/finance";

/**
 * Полная выгрузка плана в структурированный Excel (.xlsx): все цифры калькулятора —
 * данные, главный результат, как складывается сумма, распределение, накопления,
 * покупка и проверочные формулы. Открывается в Excel и Google Sheets.
 */
export async function downloadPlanXlsx(
  budget: BudgetInput,
  result: FinanceResult,
  opts?: { savingsGoal?: SavingsGoalInput; purchase?: PurchaseInput; dateLabel?: string },
) {
  const XLSX = await import("xlsx");
  const { core, allocation } = result;

  type Row = (string | number)[];
  const rows: Row[] = [];
  const blank = () => rows.push([]);
  const section = (title: string, c2 = "Сумма, ₽", c3 = "Пояснение") => rows.push([title, c2, c3]);

  rows.push(["Деньги под контролем — мой финансовый план"]);
  rows.push([`Дата: ${opts?.dateLabel ?? new Date().toLocaleDateString("ru-RU")}`]);
  blank();

  // 1. Ваши данные
  section("ВАШИ ДАННЫЕ");
  rows.push(["Доход за месяц", budget.incomeMonthly, "Зарплата и подработки одной суммой"]);
  rows.push(["На счёте сейчас", budget.currentBalance, "Деньги, которые уже лежат на счёте"]);
  rows.push(["Обязательные траты", budget.mandatoryMonthly, "Аренда, кредиты, коммуналка"]);
  rows.push(["Плановые переменные", budget.plannedVariableMonthly, "Еда, транспорт (если заложено)"]);
  rows.push(["Откладываю / копилка", budget.savingsMonthly, "Ежемесячные отложения"]);
  rows.push(["Подушка (минимум на счёте)", budget.minimumBalance, "Неприкосновенный остаток"]);
  blank();

  // 2. Главный результат
  section("ГЛАВНЫЙ РЕЗУЛЬТАТ");
  rows.push(["Свободно на жизнь", core.remainingAfterMandatory, "Доход − обязательные траты"]);
  rows.push(["В день", Math.max(0, Math.round(core.remainingAfterMandatory / 30)), "Свободно ÷ 30 дней"]);
  rows.push(["Свободный поток в месяц", core.freeBudgetMonthly, "Доход − обязательные − плановые − копилка"]);
  rows.push(["На жизнь в этом месяце", core.availableForLife, "Счёт + доход − обязательные − копилка − подушка"]);
  rows.push(["Доступно на покупку сейчас", core.availableForPurchaseNow, "С карты, без риска для подушки"]);
  rows.push(["Состояние бюджета", core.safetyStatusLabel, ""]);
  rows.push([
    "Состояние счёта",
    budget.currentBalance >= budget.minimumBalance ? "В порядке" : "Ниже подушки",
    `На счёте ${budget.currentBalance} ₽ · подушка ${budget.minimumBalance} ₽`,
  ]);
  blank();

  // 3. Как складывается сумма (полный разбор)
  section("КАК СКЛАДЫВАЕТСЯ СУММА", "Сумма, ₽", "Комментарий");
  for (const step of buildBreakdown(budget, core)) {
    rows.push([step.label, step.value, step.note ?? ""]);
  }
  blank();

  // 4. Распределение
  const cats = budget.categories ?? [];
  const totalPct = cats.reduce((s, c) => s + c.percent, 0) || 100;
  if (cats.length > 0 && core.remainingAfterMandatory > 0) {
    section("КУДА ТРАТИТЬ (распределение)", "Сумма, ₽", "Доля");
    for (const c of cats) {
      rows.push([
        c.label,
        Math.round((core.remainingAfterMandatory * c.percent) / totalPct),
        `${c.percent}%`,
      ]);
    }
    blank();
  }

  // 5. Накопления
  const goal = opts?.savingsGoal;
  const sg = result.savingsGoal;
  if (goal && goal.targetAmount > 0 && sg) {
    section("НАКОПЛЕНИЯ", "Значение", "Пояснение");
    rows.push(["Цель", goal.goalName || "Цель", ""]);
    rows.push(["Сумма цели", goal.targetAmount, ""]);
    rows.push(["Уже накоплено", goal.currentSaved, ""]);
    rows.push(["Осталось накопить", sg.remainingToSave, ""]);
    rows.push(["Откладывать в месяц", sg.effectiveContribution, "Из свободных денег"]);
    rows.push([
      "Останется на жизнь",
      Math.max(0, core.remainingAfterMandatory - sg.effectiveContribution),
      "Свободно − взнос",
    ]);
    if (sg.monthsToGoal != null) rows.push(["Срок до цели", `${sg.monthsToGoal} мес`, ""]);
    rows.push(["Статус", sg.statusLabel, sg.summary ?? ""]);
    blank();
  }

  // 6. Покупка
  const purchase = opts?.purchase;
  const pd = result.purchase;
  if (purchase && purchase.price > 0) {
    const fits = purchase.price <= core.remainingAfterMandatory;
    section("ПОКУПКА", "Значение", "Пояснение");
    rows.push(["Цена", purchase.price, ""]);
    rows.push([
      "Решение",
      pd?.decisionLabel ?? (fits ? "Можно купить" : "Копить"),
      fits
        ? `После покупки на жизнь останется ${core.remainingAfterMandatory - purchase.price} ₽`
        : `Не хватает ${purchase.price - core.remainingAfterMandatory} ₽ из свободных денег`,
    ]);
    if (pd?.explanation) rows.push(["Почему", pd.explanation, ""]);
    if (pd?.nextStep) rows.push(["Что делать", pd.nextStep, ""]);
    blank();
  }

  // 7. Проверочные формулы
  section("ТРИ ФОРМУЛЫ ДЛЯ ПРОВЕРКИ", "Результат, ₽", "Формула");
  rows.push([
    "Из зарплаты каждый месяц",
    core.freeBudgetMonthly,
    `${budget.incomeMonthly} − ${budget.mandatoryMonthly} − ${budget.plannedVariableMonthly} − ${budget.savingsMonthly}`,
  ]);
  rows.push([
    "Лимит на весь месяц",
    core.availableForLife,
    `${budget.currentBalance} + ${budget.incomeMonthly} − ${budget.mandatoryMonthly} − ${budget.savingsMonthly} − ${budget.minimumBalance}`,
  ]);
  rows.push([
    "С карты прямо сейчас",
    core.availableForPurchaseNow,
    `MAX(0; ${budget.currentBalance} − ${budget.minimumBalance} − ближайшее обязательное)`,
  ]);
  blank();
  rows.push(["Это рекомендация на основе ваших цифр, не финансовая консультация."]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 38 }, { wch: 20 }, { wch: 52 }];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Мой бюджет");
  XLSX.writeFile(wb, "moy-byudzhet.xlsx");
}
