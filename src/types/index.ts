export type PurchaseDecisionType =
  | "buy_now"
  | "wait"
  | "defer"
  | "build_reserve";

export type BudgetStatus = "healthy" | "caution" | "danger";

export interface CalculatorInput {
  monthlyIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
  debtPayments: number;
  savingsGoal: number;
  currentCash: number;
  desiredPurchasePrice: number;
  desiredPurchaseUrgency: number;
  desiredPurchaseUsefulness: number;
  mandatoryReserveAmount: number;
}

export interface CalculatorResult {
  remainingAfterFixed: number;
  freeBudget: number;
  availableForPurchase: number;
  missingAmount: number;
  monthsToPurchase: number;
  decision: PurchaseDecisionType;
  decisionLabel: string;
  explanation: string;
  budgetStatus: BudgetStatus;
  budgetStatusLabel: string;
  reserveProgress: number;
  reserveAfterPurchase: number;
  canAffordNow: boolean;
}

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled";

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

export interface Order {
  id: string;
  email: string;
  name: string;
  amount: number;
  status: OrderStatus;
  yookassaPaymentId?: string;
  createdAt: string;
  paidAt?: string;
  utm?: UtmParams;
}

export interface CheckoutFormData {
  email: string;
  name: string;
  agreeToTerms: boolean;
}

export interface YooKassaPaymentRequest {
  amount: {
    value: string;
    currency: "RUB";
  };
  capture: boolean;
  confirmation: {
    type: "redirect";
    return_url: string;
  };
  description: string;
  metadata: {
    order_id: string;
    customer_email: string;
  };
  receipt?: {
    customer: {
      email: string;
    };
    items: Array<{
      description: string;
      quantity: string;
      amount: {
        value: string;
        currency: "RUB";
      };
      vat_code: number;
      payment_mode: string;
      payment_subject: string;
    }>;
  };
}

export interface YooKassaPaymentResponse {
  id: string;
  status: string;
  paid: boolean;
  amount?: {
    value: string;
    currency: string;
  };
  confirmation?: {
    type: string;
    confirmation_url?: string;
  };
  metadata?: {
    order_id?: string;
    customer_email?: string;
  };
}
