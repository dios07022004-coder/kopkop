/** UI copy for unified calculator (/app) — v1.3 */
export const CALCULATOR_PAGE = {
  title: "Калькулятор бюджета",
  subtitle: "Введите цифры — сразу увидите, сколько денег у вас свободно",
} as const;

export const FREE_ANSWER = {
  title: "Свободно в этом месяце",
  hint: "Это деньги, которые остаются после обязательных трат и подушки",
  statusTitle: "Состояние бюджета",
} as const;

export const ALLOCATION = {
  title: "Куда распределить",
  subtitle: "Сколько примерно тратить по категориям",
} as const;

export const CALCULATOR_VIEW = {
  simple: "Просто",
  detailed: "Подробно",
  detailsTitle: "Подробности",
  detailsHint: "Копилка, покупка, формулы и категории",
} as const;

export const CALCULATOR_MAIN = {
  spendTitle: "Сколько можно тратить в этом месяце",
  fromSalary: "Сколько можно тратить из зарплаты",
  fromCardSafe: "Можно потратить сейчас без риска",
  fromCardHint: "С карты — без вреда подушке",
  purchaseTitle: "Хватит ли на покупку сейчас",
  purchaseOff: "Не проверяем — включите «Хочу купить» ниже",
  budgetTitle: "Состояние бюджета",
  perMonth: "/мес",
  whatNext: "Что делать",
  why: "Почему так",
  purchaseWhy: "Почему",
  toSave: "Нужно накопить",
  timeline: "Срок",
  monthlyRate: "Откладывать",
  fundingSource: "Откуда деньги",
  lifeImpact: "Если копить по плану",
  whatIfTitle: "Что будет, если…",
  whatIfHint: "Нажмите — цифры пересчитаются сразу",
  compareTitle: "Сравнение сценариев",
  compareBaseline: "Запомнить «сейчас»",
  compareClear: "Сбросить",
  compareColBefore: "Было",
  compareColAfter: "Стало",
  actionsTitle: "Как улучшить ситуацию",
  confidenceTitle: "Точность расчёта",
  verifyTitle: "Проверить расчёт",
} as const;

export const BUDGET_MOOD = {
  calm: {
    label: "Спокойно",
    nextStep: (fromSalary: string) =>
      `Можно тратить в пределах ${fromSalary} из зарплаты каждый месяц.`,
  },
  caution: {
    label: "Осторожно",
    nextStep:
      "Лучше держаться лимита и не трогать резерв — запас пока тонкий.",
  },
  danger: {
    label: "Опасно",
    nextStep:
      "Сначала сократите обязательные траты или отложите покупку — доход не покрывает расходы.",
  },
} as const;

export const CALCULATOR_PLAN = {
  title: "Подробный план",
  spendFromSalary: "Сколько можно тратить из зарплаты",
  spendTotal: "Сколько можно тратить сейчас всего",
  saveForGoal: (name: string) => `Копить на «${name}»`,
  saveForGoalGeneric: "Копить на цель",
  saveForPurchase: (price: string) => `Копить на покупку ${price}`,
  fromCard: "Можно потратить сейчас без риска (с карты)",
  purchaseDecision: "Решение по покупке",
  perMonth: "/мес",
  deferHint: (months: number, noLifeLeft: boolean) =>
    noLifeLeft
      ? `ещё ${months} мес · на жизнь из зарплаты не останется`
      : `ещё ${months} мес`,
} as const;

export const CALCULATOR_TOGGLES = {
  saving: {
    label: "Коплю на что-то большое",
    hint: "Машина, отпуск, ремонт",
  },
  buying: {
    label: "Хочу что-то купить",
    hint: "Проверим, хватит ли денег сейчас",
  },
  plannedSpending: {
    label: "Уже знаю траты на еду и быт",
    hint: "Точнее посчитаем сумму из зарплаты",
  },
} as const;

export const CALCULATOR_STATUS = {
  flowDanger: "Доход не покрывает расходы — сначала сократите траты или увеличьте доход.",
  reserveLow: (minimum: string) =>
    `На счёте меньше подушки (${minimum}) — резерв лучше поднять.`,
  allIncomeToGoal: (goalName: string) =>
    `Весь свободный доход уходит на «${goalName}» — на жизнь из зарплаты почти ничего.`,
} as const;

export const CALCULATOR_INPUTS = {
  sectionTitle: "Ваши цифры",
  sectionSubtitle: "Меняете — ответ пересчитается сразу",
  presetsTitle: "Быстрый старт",
  fieldsHelpTitle: "Что означают поля",
  income: {
    label: "Сколько получу в этом месяце",
    tooltip: "Зарплата и подработки — одной суммой",
    placeholder: "120 000",
  },
  balance: {
    label: "Сколько на карте/счёте сейчас",
    tooltip: "Деньги, которые уже лежат на счёте",
    placeholder: "25 000",
  },
  mandatory: {
    label: "Обязательные траты",
    tooltip: "Аренда + кредиты + коммуналка — суммой",
    placeholder: "60 000",
  },
  reserve: {
    label: "Подушка на счёте",
    tooltip: "Неприкосновенный остаток — ниже не опускаемся",
    placeholder: "25 000",
  },
  payday: {
    label: "День зарплаты (число) — необязательно",
    tooltip: "Какого числа приходит доход. Тогда считаем «в день» честно — от остатка на счёте до зарплаты, а не равномерно по месяцу. Пусто — считаем по календарному месяцу.",
    placeholder: "10",
  },
  savingsLabel: "Сколько откладываю в месяц",
  savingsHint: "Уменьшает сумму «из зарплаты»",
  plannedLabel: "Плановые траты на еду и быт",
  plannedHint: "Уже заложено в бюджет",
} as const;

export const CALCULATOR_SECTIONS = {
  purchase: {
    title: "Что хочу купить",
    priceLabel: "Сколько стоит, ₽",
    urgencyLabel: "Нужна ли покупка прямо сейчас?",
    urgencyHint: "1–2 = можно подождать неделю",
    usefulnessLabel: "Можно ли подождать 7 дней?",
    usefulnessHint: "1–2 = часто желание проходит",
    decision: "Решение",
    why: "Почему",
    nextStep: "Что делать",
    empty: "Укажите цену покупки",
  },
  goal: {
    title: "На что коплю",
    nameLabel: "Название",
    targetLabel: "Сколько нужно накопить (цель целиком), ₽",
    savedLabel: "Уже есть, ₽",
    deadlineLabel: "За сколько месяцев хочу успеть",
    reserveCheckbox: "Если из зарплаты не хватает — можно добрать со счёта",
    empty: "Укажите сумму цели",
  },
  howCalculated: {
    title: "Откуда цифры",
    subtitle: "Три формулы для проверки",
  },
  verify: {
    chainTitle: "Простая цепочка — откуда взялась сумма «на жизнь»",
    formulasTitle: "Три формулы для проверки",
  },
  expert: {
    title: "Категории и детали",
    subtitle: "Для тех, кто хочет копнуть глубже",
  },
} as const;

export const PURCHASE_DECISION_DISPLAY = {
  buy_now: "Можно купить",
  wait: "Подождать неделю",
  build_reserve: "Сначала пополнить счёт",
  defer: (months: number) => `Купить через ${months} мес`,
} as const;

export const PURCHASE_NEXT = {
  buy_now: "Можно покупать — резерв после покупки в порядке.",
  wait: "Запишите покупку и вернитесь через 7 дней.",
  build_reserve: "Сначала пополните подушку до минимума.",
  defer: (months: number) => `Откладывайте по плану — хватит примерно через ${months} мес.`,
} as const;

/** @deprecated */
export const CALCULATOR_HERO = {
  label: "Сколько можно тратить из зарплаты",
  suffix: "₽/мес",
  afterMandatoryAndSavings: "После обязательных платежей и отложений",
  afterMandatoryAndGoal: (savings: string, goalName: string) =>
    `После обязательных и ${savings} ₽/мес на «${goalName}»`,
  noLifeLeft: "Из зарплаты на жизнь не остаётся",
} as const;
