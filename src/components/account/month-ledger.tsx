"use client";

import { useEffect, useState } from "react";
import { Plus, Minus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Summary = {
  hasBudget: boolean;
  linked: boolean;
  income: number;
  free: number;
  spentMonth: number;
  extraIncome: number;
  remaining: number;
  perDay: number;
  daysLeft: number;
  goalName: string | null;
  goalRemaining: number;
  cycleMode: boolean;
  nextPayday: string | null;
  base: number;
};

const fmtDate = (ymd: string) => `${ymd.slice(8, 10)}.${ymd.slice(5, 7)}`;

type Entry = {
  id: number;
  kind: "expense" | "income";
  amount: number;
  note: string | null;
  day: string;
  source: string;
};

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

export function MonthLedger({ initial }: { initial?: Summary }) {
  const [summary, setSummary] = useState<Summary | null>(initial ?? null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/ledger/summary");
      if (!res.ok) {
        setLoaded(true);
        return;
      }
      const data = await res.json();
      setSummary(data.summary);
      setEntries(data.entries ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    const value = Math.round(Math.abs(Number(amount.replace(/\s/g, "").replace(",", "."))));
    if (!value || value <= 0) {
      setError("Введите сумму больше 0");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ledger/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, amount: value, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось добавить");
        return;
      }
      setSummary(data.summary);
      setEntries(data.entries ?? []);
      setAmount("");
      setNote("");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    try {
      const res = await fetch("/api/ledger/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
        setEntries(data.entries ?? []);
      }
    } catch {
      /* ignore */
    }
  };

  // Карточку показываем только если есть бюджет (иначе нечего считать)
  if (loaded && (!summary || !summary.hasBudget)) {
    return (
      <Card className="soft-card mt-4">
        <CardHeader>
          <CardTitle>Этот месяц</CardTitle>
          <CardDescription>
            Сохраните расчёт в калькуляторе — и здесь появится живая картина месяца: сколько можно
            тратить, сколько осталось, плюс разовые доходы и траты.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/app">Открыть калькулятор</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const s = summary;
  const over = s ? s.remaining < 0 : false;

  const cycle = s?.cycleMode ?? false;
  const title = cycle ? "До зарплаты" : "Этот месяц";
  const firstLabel = cycle ? "Доступно" : "Свободно";
  const firstValue = cycle ? s?.base ?? 0 : s?.free ?? 0;

  return (
    <Card className="soft-card mt-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {cycle
            ? `Деньги на счёте до зарплаты ${s?.nextPayday ? fmtDate(s.nextPayday) : ""} минус траты плюс разовые доходы. То же видно в Telegram-боте.`
            : "Свободно за месяц минус траты плюс разовые доходы. То же видно в Telegram-боте."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {s && (
          <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground">{firstLabel}</p>
                <p className="text-base font-semibold">{fmt(firstValue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Потрачено</p>
                <p className="text-base font-semibold">{fmt(s.spentMonth)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Доп. доход</p>
                <p className="text-base font-semibold">{s.extraIncome > 0 ? `+${fmt(s.extraIncome)}` : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Осталось</p>
                <p className={cn("text-base font-semibold", over && "text-[hsl(var(--danger))]")}>
                  {over ? `−${fmt(-s.remaining)}` : fmt(s.remaining)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {over
                ? `Перерасход. ${cycle ? "До зарплаты" : "До конца месяца"} лучше не тратить (${s.daysLeft} дн.).`
                : `≈ ${fmt(s.perDay)}/день на ${s.daysLeft} дн.${cycle && s.nextPayday ? ` (до зарплаты ${fmtDate(s.nextPayday)})` : ""}`}
              {s.goalName && s.goalRemaining > 0 && ` · 🎯 до «${s.goalName}»: ${fmt(s.goalRemaining)}`}
            </p>
          </div>
        )}

        {/* Добавить разовую сумму */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setKind("expense")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                kind === "expense"
                  ? "border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/10 text-[hsl(var(--danger))]"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              <Minus className="h-4 w-4" /> Трата
            </button>
            <button
              type="button"
              onClick={() => setKind("income")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                kind === "income"
                  ? "border-[hsl(var(--success))] bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              <Plus className="h-4 w-4" /> Доход
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              inputMode="numeric"
              placeholder="Сумма, ₽"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="sm:w-32"
            />
            <Input
              placeholder={kind === "income" ? "Например: премия" : "Например: ремонт"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1"
            />
            <Button onClick={add} disabled={busy}>
              {busy ? "Добавляем…" : "Добавить"}
            </Button>
          </div>
          {error && <p className="text-xs text-[hsl(var(--danger))]">{error}</p>}
          {s?.linked && (
            <p className="text-xs text-muted-foreground">Бот привязан — отчёт об изменении придёт в Telegram.</p>
          )}
        </div>

        {/* Список записей месяца */}
        {entries.length > 0 && (
          <ul className="space-y-1.5">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {e.kind === "income" ? (
                    <TrendingUp className="h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
                  ) : (
                    <TrendingDown className="h-4 w-4 shrink-0 text-[hsl(var(--danger))]" />
                  )}
                  <span className="truncate">
                    {e.note || (e.kind === "income" ? "Разовый доход" : "Трата")}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {e.day.slice(8, 10)}.{e.day.slice(5, 7)}
                      {e.source === "tg" ? " · TG" : ""}
                    </span>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn("font-medium", e.kind === "income" ? "text-[hsl(var(--success))]" : "")}>
                    {e.kind === "income" ? "+" : "−"}
                    {fmt(e.amount)}
                  </span>
                  <Button variant="ghost" size="sm" aria-label="Удалить" onClick={() => remove(e.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
