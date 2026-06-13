export interface CalculatorPreset {
  id: string;
  label: string;
  description: string;
  budget: {
    incomeMonthly: number;
    currentBalance: number;
    mandatoryMonthly: number;
    minimumBalance: number;
    plannedVariableMonthly: number;
    savingsMonthly: number;
  };
  purchase?: { price: number; urgency: number; usefulness: number };
  savingsGoal?: {
    goalName: string;
    targetAmount: number;
    currentSaved: number;
    deadlineMonths?: number;
    monthlyContribution?: number;
    canUseReserve: boolean;
    priority: "low" | "medium" | "high";
  };
  ui: {
    saving: boolean;
    buying: boolean;
    plannedSpending: boolean;
  };
}

export const CALCULATOR_PRESETS: CalculatorPreset[] = [
  {
    id: "student",
    label: "Студент",
    description: "Мало дохода, небольшая покупка",
    budget: {
      incomeMonthly: 25_000,
      currentBalance: 10_000,
      mandatoryMonthly: 18_000,
      minimumBalance: 5_000,
      plannedVariableMonthly: 0,
      savingsMonthly: 0,
    },
    purchase: { price: 5_000, urgency: 2, usefulness: 3 },
    ui: { saving: false, buying: true, plannedSpending: false },
  },
  {
    id: "freelancer",
    label: "Фрилансер",
    description: "120k доход, цель «Машина»",
    budget: {
      incomeMonthly: 120_000,
      currentBalance: 45_000,
      mandatoryMonthly: 50_000,
      minimumBalance: 20_000,
      plannedVariableMonthly: 0,
      savingsMonthly: 70_000,
    },
    savingsGoal: {
      goalName: "Машина",
      targetAmount: 1_000_000,
      currentSaved: 120_000,
      deadlineMonths: 9,
      monthlyContribution: 70_000,
      canUseReserve: true,
      priority: "medium",
    },
    purchase: { price: 35_000, urgency: 3, usefulness: 4 },
    ui: { saving: true, buying: true, plannedSpending: false },
  },
  {
    id: "family",
    label: "Семья",
    description: "Крупный доход, срочная покупка",
    budget: {
      incomeMonthly: 180_000,
      currentBalance: 50_000,
      mandatoryMonthly: 90_000,
      minimumBalance: 40_000,
      plannedVariableMonthly: 15_000,
      savingsMonthly: 20_000,
    },
    purchase: { price: 45_000, urgency: 5, usefulness: 5 },
    ui: { saving: true, buying: true, plannedSpending: true },
  },
  {
    id: "salary-twice",
    label: "Зарплата 2 раза",
    description: "Средний доход, копилка 10k",
    budget: {
      incomeMonthly: 80_000,
      currentBalance: 45_000,
      mandatoryMonthly: 40_000,
      minimumBalance: 30_000,
      plannedVariableMonthly: 10_000,
      savingsMonthly: 10_000,
    },
    ui: { saving: true, buying: false, plannedSpending: true },
  },
];
