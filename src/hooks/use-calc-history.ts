"use client";

import { useCallback, useEffect, useState } from "react";
import type { BudgetInput, PurchaseInput, SavingsGoalInput } from "@/lib/finance";

const KEY = "dpc-history-v1";
const MAX_ITEMS = 20;

export interface CalcSnapshot {
  id: string;
  label: string; // дата-метка
  free: number; // свободно на жизнь (для подписи)
  budget: BudgetInput;
  purchase: PurchaseInput;
  savingsGoal: SavingsGoalInput;
}

function load(): CalcSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CalcSnapshot[]) : [];
  } catch {
    return [];
  }
}

export function useCalcHistory() {
  const [items, setItems] = useState<CalcSnapshot[]>([]);

  useEffect(() => {
    setItems(load());
  }, []);

  const persist = useCallback((next: CalcSnapshot[]) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full / disabled — ignore */
    }
  }, []);

  const save = useCallback(
    (snap: Omit<CalcSnapshot, "id" | "label">) => {
      const item: CalcSnapshot = {
        ...snap,
        id: `${new Date().getTime()}-${items.length}`,
        label: new Date().toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      persist([item, ...items].slice(0, MAX_ITEMS));
    },
    [items, persist],
  );

  const remove = useCallback(
    (id: string) => persist(items.filter((i) => i.id !== id)),
    [items, persist],
  );

  return { items, save, remove };
}
