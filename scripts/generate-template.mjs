/**
 * Generates the budget tracker Excel template.
 * Formulas synced with src/lib/finance/ — see scripts/finance-spec.mjs
 * Run: npm run generate:template
 */
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_INPUT,
  DEFAULT_SAVINGS_GOAL,
  THRESHOLD_CAUTION_AVAILABLE_LIFE,
  THRESHOLD_CAUTION_FREE_BUDGET,
} from "./finance-spec.mjs";

const outputDir = path.join(process.cwd(), "private", "downloads");
const outputFile = path.join(outputDir, "budget-tracker-template.xlsx");

const D = DEFAULT_INPUT;

/** SheetJS drops formula-only cells on write unless t/v are set */
function ensureFormulaCells(ws) {
  for (const ref of Object.keys(ws)) {
    if (ref.startsWith("!")) continue;
    const cell = ws[ref];
    if (cell.f && cell.t == null) {
      cell.t = typeof cell.v === "string" ? "s" : "n";
      if (cell.v == null) cell.v = cell.t === "s" ? "" : 0;
    }
  }
}

const DEFAULT_COLS = [
  { wch: 36 },
  { wch: 18 },
  { wch: 32 },
  { wch: 16 },
  { wch: 14 },
  { wch: 22 },
];

function appendSheet(wb, data, name, cols = DEFAULT_COLS) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  ensureFormulaCells(ws);
  ws["!cols"] = cols;
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function createWorkbook() {
  const wb = XLSX.utils.book_new();

  const startData = [
    ["ФИНАНСОВЫЙ ТРЕКЕР БЮДЖЕТА — «Деньги под контролем»"],
    [""],
    ["Быстрый старт:"],
    ["1. Распределение → 2. Резерв → 3. Покупка → 4. Цели → 5. Дашборд"],
    [""],
    ["Глоссарий:"],
    ["На жизнь", "Счёт + доход − обязательные − копилка − минимум на счёте"],
    ["Свободный поток", "Доход − обязательные − переменные − копилка"],
    ["Доступно на покупку", "С учётом минимума и ближайших обязательных с баланса"],
    [""],
    ["Цвета:", "Зелёный — OK", "Жёлтый — осторожно", "Красный — не хватает"],
  ];
  appendSheet(wb, startData, "Старт");

  appendSheet(
    wb,
    [
      ["Дата", "Источник", "Категория", "Сумма", "Комментарий"],
      ["2026-06-01", "Работа", "Зарплата", D.incomeMonthly, ""],
      ["2026-06-15", "Клиент А", "Фриланс", 25000, ""],
    ],
    "Доходы",
  );

  appendSheet(
    wb,
    [
      ["Дата", "Категория", "Подкатегория", "Тип", "Сумма", "Комментарий"],
      ["2026-06-01", "Жильё", "Аренда", "Обязательный", D.rent, ""],
      ["2026-06-01", "Кредиты", "Платёж", "Обязательный", D.credit, ""],
      ["2026-06-05", "Еда", "Продукты", "Переменный", 12000, ""],
    ],
    "Расходы",
  );

  // Распределение — mirrors computeBudgetCore()
  const allocationData = [
    ["РАСПРЕДЕЛЕНИЕ ТРАТ"],
    [""],
    ["Параметр", "Значение", "Пояснение"],
    ["На счёте сейчас", D.currentBalance, ""],
    ["Доход за месяц", D.incomeMonthly, ""],
    ["Аренда / ипотека", D.rent, "Обязательное"],
    ["Кредиты", D.credit, "Обязательное"],
    ["Коммуналка", D.utilities, "Обязательное"],
    ["Плановые переменные", D.plannedVariable, "Еда, транспорт"],
    ["Копилка / цели", D.savings, ""],
    ["Минимум на счёте", D.minimumBalance, "Подушка безопасности"],
    [""],
    ["РАСЧЁТЫ", "", ""],
    ["Обязательные (итого)", { f: "SUM(B6:B8)" }, ""],
    ["Всего ресурсов", { f: "B4+B5" }, "Счёт + доход"],
    [
      "На жизнь в месяц",
      { f: "MAX(0,B15-B14-B10-B11)" },
      "availableForLife",
    ],
    [
      "Свободный поток",
      { f: "B5-B14-B9-B10" },
      "freeBudgetMonthly",
    ],
    [
      "Доступно на покупку сейчас",
      { f: "MAX(0,B4-B11-MIN(B4,B14))" },
      "availableForPurchaseNow",
    ],
    [
      "Можно потратить сейчас",
      { f: "B18" },
      "= доступно на покупку",
    ],
    [""],
    ["КУДА ТРАТИТЬ", "Сумма", "%"],
    [
      DEFAULT_CATEGORIES[0].label,
      { f: `ROUND(B16*${DEFAULT_CATEGORIES[0].percent / 100},0)` },
      `${DEFAULT_CATEGORIES[0].percent}%`,
    ],
    [
      DEFAULT_CATEGORIES[1].label,
      { f: `ROUND(B16*${DEFAULT_CATEGORIES[1].percent / 100},0)` },
      `${DEFAULT_CATEGORIES[1].percent}%`,
    ],
    [
      DEFAULT_CATEGORIES[2].label,
      { f: `ROUND(B16*${DEFAULT_CATEGORIES[2].percent / 100},0)` },
      `${DEFAULT_CATEGORIES[2].percent}%`,
    ],
    [
      DEFAULT_CATEGORIES[3].label,
      { f: `ROUND(B16*${DEFAULT_CATEGORIES[3].percent / 100},0)` },
      `${DEFAULT_CATEGORIES[3].percent}%`,
    ],
    [
      DEFAULT_CATEGORIES[4].label,
      { f: "B16-B22-B23-B24-B25" },
      "остаток округления",
    ],
    [""],
    [
      "Статус",
      {
        f: `IF(B16<=0,"Не хватает",IF(B16<${THRESHOLD_CAUTION_AVAILABLE_LIFE},"Осторожно","В порядке"))`,
      },
      "",
    ],
  ];
  appendSheet(wb, allocationData, "Распределение");

  const purchaseData = [
    ["КАЛЬКУЛЯТОР: КУПИТЬ ИЛИ НЕТ"],
    [""],
    ["Параметр", "Значение", "Пояснение"],
    ["Название покупки", "Ноутбук", ""],
    ["Цена", D.purchasePrice, ""],
    ["Срочность (1-5)", 3, ""],
    ["Полезность (1-5)", 4, ""],
    [""],
    ["Связь с Распределением", "", ""],
    ["Доступно на покупку", { f: "Распределение!B18" }, ""],
    ["Свободный поток", { f: "Распределение!B17" }, ""],
    ["На счёте", { f: "Распределение!B4" }, ""],
    ["Минимум на счёте", { f: "Распределение!B11" }, ""],
    [""],
    ["РАСЧЁТЫ", "", ""],
    ["Не хватает", { f: "MAX(0,B5-B10)" }, ""],
    ["После покупки на счёте", { f: "B12-B5" }, ""],
    [
      "Месяцев до покупки",
      {
        // monthsToPurchase: только когда не хватает И есть свободный поток
        f: "IF(AND(B16>0,B11>0),CEILING(B16/B11,1),0)",
      },
      "",
    ],
    [
      "СТАТУС",
      {
        // Дерево решений 1:1 с decidePurchase() (src/lib/finance/purchase-decision.ts)
        // B5 цена, B6 срочность, B7 полезность, B10 доступно сейчас,
        // B11 свободный поток, B12 на счёте, B13 минимум,
        // B16 не хватает (missing), B17 после покупки (reserveAfter)
        f: 'IF(AND(B12>=B5,B17<B13),"Сначала пополнить счёт",IF(AND(B16>0,B11<=0),"Сначала стабилизировать бюджет",IF(AND(B16>0,B11>0),"Купить через "&B18&" мес",IF(AND(B16=0,B11<0),"Отложить",IF(AND(B16=0,B6<=2,B7<=2),"Подождать неделю",IF(AND(B16=0,B11>=0),"Можно купить","Отложить"))))))',
      },
      "",
    ],
  ];
  appendSheet(wb, purchaseData, "Решение о покупке");

  const G = DEFAULT_SAVINGS_GOAL;
  const goalsData = [
    ["КАЛЬКУЛЯТОР: НАКОПИТЬ"],
    [""],
    ["Параметр", "Значение", "Пояснение"],
    ["Название цели", G.goalName, ""],
    ["Сумма цели", G.targetAmount, "targetAmount"],
    ["Уже накоплено", G.currentSaved, "currentSaved"],
    ["Срок (мес)", G.deadlineMonths, "deadlineMonths"],
    ["Взнос в месяц", G.monthlyContribution, "monthlyContribution"],
    [""],
    ["Связь с Распределением", "", ""],
    ["Свободный поток", { f: "Распределение!B17" }, "freeBudgetMonthly"],
    ["На счёте", { f: "Распределение!B4" }, ""],
    ["Минимум на счёте", { f: "Распределение!B11" }, ""],
    [""],
    ["РАСЧЁТЫ", "", ""],
    ["Осталось накопить", { f: "MAX(0,B5-B6)" }, "remainingToSave"],
    [
      "Нужно в месяц (по сроку)",
      { f: 'IF(B7>0,CEILING(B16/B7,1),"")' },
      "requiredMonthly",
    ],
    [
      "Месяцев до цели",
      {
        f: 'IF(B8>0,CEILING(B16/B8,1),IF(B7>0,B7,""))',
      },
      "monthsToGoal",
    ],
    [
      "Прогресс %",
      { f: "IF(B5>0,MIN(100,B6/B5*100),0)" },
      "progressPercent",
    ],
    [
      "Безопасный взнос",
      { f: "MAX(0,B11)" },
      "safeContribution = freeBudget",
    ],
    [
      "СТАТУС",
      {
        f: 'IF(B6>=B5,"Достигнуто",IF(B11<=0,"Невозможно",IF(B8>B11,"Осторожно",IF(AND(B7>0,B17>B11),"Осторожно","В порядке"))))',
      },
      "",
    ],
  ];
  appendSheet(wb, goalsData, "Цели");

  appendSheet(
    wb,
    [
      ["РЕЗЕРВ"],
      ["Текущий баланс", { f: "Распределение!B4" }],
      ["Минимум на счёте", { f: "Распределение!B11" }],
      ["Прогресс %", { f: "IF(B3>0,MIN(100,B2/B3*100),0)" }],
      ["Статус", { f: 'IF(B2>=B3,"В порядке","Осторожно")' }],
    ],
    "Резерв",
  );

  // Все показатели берутся из листа «Распределение» (единый источник = ваш план),
  // чтобы дашборд не противоречил калькулятору. Листы «Доходы»/«Расходы» —
  // журнал для факта (справочно, ниже).
  const dashboardData = [
    ["ДАШБОРД"],
    [""],
    ["Показатель", "Значение", "Источник"],
    ["Доход (мес.)", { f: "Распределение!B5" }, "план"],
    ["Обязательные", { f: "Распределение!B14" }, "план"],
    ["Плановые переменные", { f: "Распределение!B9" }, "план"],
    ["Свободный поток", { f: "Распределение!B17" }, "freeBudgetMonthly"],
    ["На жизнь", { f: "Распределение!B16" }, "availableForLife"],
    ["Копилка", { f: "Распределение!B10" }, "план"],
    ["Минимум на счёте", { f: "Распределение!B11" }, "план"],
    [""],
    [
      "Статус бюджета",
      {
        f: `IF(B7<0,"Опасно",IF(B7<${THRESHOLD_CAUTION_FREE_BUDGET},"Осторожно","В порядке"))`,
      },
      "",
    ],
    [""],
    ["Факт по журналу (справочно)", "", ""],
    ["Доход по «Доходы»", { f: "SUM('Доходы'!D:D)" }, "сумма строк"],
    ["Обязательные по «Расходы»", { f: "SUMIF('Расходы'!D:D,\"Обязательный\",'Расходы'!E:E)" }, "сумма строк"],
    ["Переменные по «Расходы»", { f: "SUMIF('Расходы'!D:D,\"Переменный\",'Расходы'!E:E)" }, "сумма строк"],
  ];
  appendSheet(wb, dashboardData, "Дашборд");

  return wb;
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

XLSX.writeFile(createWorkbook(), outputFile);
console.log(`Template saved to ${outputFile}`);
