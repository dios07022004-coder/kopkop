import { z } from "zod";

export const mandatoryExpenseSchema = z.object({
  id: z.string(),
  label: z.string(),
  amount: z.coerce.number().min(0),
});

export const budgetCategorySchema = z.object({
  id: z.string(),
  label: z.string(),
  percent: z.coerce.number().min(0),
});

export const budgetInputSchema = z.object({
  incomeMonthly: z.coerce.number().min(0),
  currentBalance: z.coerce.number().min(0),
  mandatoryMonthly: z.coerce.number().min(0).optional(),
  mandatoryExpenses: z.array(mandatoryExpenseSchema).optional(),
  plannedVariableMonthly: z.coerce.number().min(0),
  savingsMonthly: z.coerce.number().min(0),
  minimumBalance: z.coerce.number().min(0),
  reserveTarget: z.coerce.number().min(0).optional(),
  categories: z.array(budgetCategorySchema).optional(),
});

export const purchaseInputSchema = z.object({
  price: z.coerce.number().min(0),
  urgency: z.coerce.number().min(1).max(5),
  usefulness: z.coerce.number().min(1).max(5),
});

export type BudgetInputSchema = z.infer<typeof budgetInputSchema>;
export type PurchaseInputSchema = z.infer<typeof purchaseInputSchema>;

/** @deprecated Use budgetInputSchema + purchaseInputSchema */
export const calculatorSchema = z.object({
  monthlyIncome: z.coerce.number().min(0),
  fixedExpenses: z.coerce.number().min(0),
  variableExpenses: z.coerce.number().min(0),
  debtPayments: z.coerce.number().min(0),
  savingsGoal: z.coerce.number().min(0),
  currentCash: z.coerce.number().min(0),
  desiredPurchasePrice: z.coerce.number().min(0),
  desiredPurchaseUrgency: z.coerce.number().min(1).max(5),
  desiredPurchaseUsefulness: z.coerce.number().min(1).max(5),
  mandatoryReserveAmount: z.coerce.number().min(0),
});

export type CalculatorSchema = z.infer<typeof calculatorSchema>;

export const checkoutSchema = z.object({
  email: z
    .string()
    .min(1, "Укажите email")
    .email("Некорректный email"),
  name: z
    .string()
    .min(2, "Укажите имя")
    .max(100, "Слишком длинное имя"),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: "Необходимо согласие с офертой" }),
  }),
});

export type CheckoutSchema = z.infer<typeof checkoutSchema>;
