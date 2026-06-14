"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { BudgetInput, PurchaseInput, SavingsGoalInput } from "@/lib/finance";

const KEY = "dpc-history-v1";
const MAX_ITEMS = 20;

export interface CalcSnapshot {
  id: string;
  label: string;
  free: number;
  budget: BudgetInput;
  purchase: PurchaseInput;
  savingsGoal: SavingsGoalInput;
}

type DbRow = {
  id: string;
  label: string | null;
  free: number | null;
  payload: { budget: BudgetInput; purchase: PurchaseInput; savingsGoal: SavingsGoalInput };
};

function rowToSnap(r: DbRow): CalcSnapshot {
  return {
    id: r.id,
    label: r.label ?? "",
    free: r.free ?? 0,
    budget: r.payload.budget,
    purchase: r.payload.purchase,
    savingsGoal: r.payload.savingsGoal,
  };
}

function nowLabel() {
  return new Date().toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function loadLocal(): CalcSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CalcSnapshot[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(items: CalcSnapshot[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

/**
 * История расчётов. Если пользователь авторизован — хранится в Supabase
 * (привязана к аккаунту, доступна с любого устройства). Иначе — в localStorage.
 */
export function useCalcHistory() {
  const [items, setItems] = useState<CalcSnapshot[]>([]);
  const [userId, setUserId] = useState<string | null>(null); // null = локальный режим

  useEffect(() => {
    let active = true;
    (async () => {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && active) {
          setUserId(user.id);
          const { data } = await supabase
            .from("calculations")
            .select("id,label,free,payload")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(MAX_ITEMS);
          if (active) setItems((data ?? []).map((r) => rowToSnap(r as DbRow)));
          return;
        }
      }
      if (active) setItems(loadLocal());
    })();
    return () => {
      active = false;
    };
  }, []);

  const saveLocalSnap = useCallback((snap: Omit<CalcSnapshot, "id" | "label">, label: string) => {
    const item: CalcSnapshot = { ...snap, id: `${new Date().getTime()}`, label };
    setItems((prev) => {
      const next = [item, ...prev].slice(0, MAX_ITEMS);
      saveLocal(next);
      return next;
    });
  }, []);

  /** Сохранить расчёт. Возвращает true при успехе, иначе бросает понятную ошибку. */
  const save = useCallback(
    async (snap: Omit<CalcSnapshot, "id" | "label">) => {
      const label = nowLabel();
      if (userId) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("calculations")
          .insert({
            user_id: userId,
            label,
            free: Math.round(snap.free),
            payload: {
              budget: snap.budget,
              purchase: snap.purchase,
              savingsGoal: snap.savingsGoal,
            },
          })
          .select("id,label,free,payload")
          .single();
        if (error || !data) {
          // не теряем расчёт пользователя — кладём локально и сообщаем об ошибке
          saveLocalSnap(snap, label);
          throw new Error(error?.message ?? "Не удалось сохранить в аккаунт");
        }
        setItems((prev) => [rowToSnap(data as DbRow), ...prev].slice(0, MAX_ITEMS));
        return true;
      }
      saveLocalSnap(snap, label);
      return true;
    },
    [userId, saveLocalSnap],
  );

  const remove = useCallback(
    async (id: string) => {
      if (userId) {
        const supabase = createClient();
        await supabase.from("calculations").delete().eq("id", id);
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        setItems((prev) => {
          const next = prev.filter((i) => i.id !== id);
          saveLocal(next);
          return next;
        });
      }
    },
    [userId],
  );

  return { items, save, remove };
}
