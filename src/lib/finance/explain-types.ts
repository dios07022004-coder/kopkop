import type { BudgetCore, BudgetInput, PurchaseDecision } from "./types";

export interface FieldHint {
  label: string;
  why: string;
  example: string;
}

export interface ExplainStep {
  id: string;
  label: string;
  amount: number;
  why: string;
  kind: "plus" | "minus" | "equals" | "result";
}

export interface AnswerCardData {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  why: string;
  tone: "primary" | "neutral" | "success" | "warning" | "danger";
}

export type ExplainContext = {
  input: BudgetInput;
  core: BudgetCore;
  purchase?: PurchaseDecision;
  purchasePrice: number;
};
