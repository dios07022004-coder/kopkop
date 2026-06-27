"use client";

import { useEffect, useState } from "react";
import { Plus, Minus, Trash2, TrendingUp, TrendingDown, X, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyticsRing } from "@/components/account/analytics-ring";
import { cn } from "@/lib/utils";

type Summary = {
  hasBudget: boolean;
  linked: boolean;
  income: number;
  free: number;
  spentMonth: number;
  spentToday: number;
  extraIncome: number;
  remaining: number;
  perDay: number;
  daysLeft: number;
  goalName: string | null;
  goalRemaining: number;
  cycleMode: boolean;
  nextPayday: string | null;
  base: number;
  categories: { label: string; amount: number; percent: number }[];
  purchase: { price: number; gap: number; months: number | null } | null;
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
function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/70 px-2 py-2.5 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold tabular-nums",
          tone === "success" && "text-[hsl(var(--success))]",
          tone === "danger" && "text-[hsl(var(--danger))]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

type Template = { id: string; label: string | null; free: number | null; active: boolean };

export function MonthLedger({ initial }: { initial?: Summary }) {
  const [summary, setSummary] = useState<Summary | null>(initial ?? null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hint, setHint] = useState(false);
  useEffect(() => {
    try {
      setHint(!localStorage.getItem("dpc-cabinet-hint"));
    } catch {
      /* ignore */
    }
  }, []);
  const dismissHint = () => {
    try {
      localStorage.setItem("dpc-cabinet-hint", "1");
    } catch {
      /* ignore */
    }
    setHint(false);
  };

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
      setTemplates(data.templates ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  };

  const [activating, setActivating] = useState<string | null>(null);
  const activate = async (id: string) => {
    setActivating(id);
    setError(null);
    try {
      const res = await fetch("/api/templates/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
        setEntries(data.entries ?? []);
        setTemplates(data.templates ?? []);
      } else {
        setError(data.error ?? "Не удалось переключить шаблон");
      }
    } catch {
      setError("Сеть недоступна");
    } finally {
      setActivating(null);
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

  const delTemplate = async (id: string) => {
    if (!window.confirm("Удалить этот шаблон?")) return;
    try {
      const res = await fetch("/api/templates/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
        setEntries(data.entries ?? []);
        setTemplates(data.templates ?? []);
      } else setError(data.error ?? "Не удалось удалить");
    } catch {
      setError("Сеть недоступна");
    }
  };

  const renameTemplate = async (id: string, current: string) => {
    const label = window.prompt("Название шаблона:", current || "");
    if (label == null || !label.trim()) return;
    try {
      const res = await fetch("/api/templates/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, label }),
      });
      const data = await res.json();
      if (res.ok) setTemplates(data.templates ?? []);
    } catch {
      /* ignore */
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
    const onAppPage = typeof window !== "undefined" && window.location.pathname.startsWith("/app");
    return (
      <Card className="soft-card mt-4">
        <CardHeader>
          <CardTitle>Этот месяц</CardTitle>
          <CardDescription>
            {onAppPage
              ? "Заполните цифры выше и нажмите «Сохранить расчёт» — здесь появится живая картина месяца: сколько можно тратить, сколько осталось, плюс разовые доходы и траты."
              : "Сохраните расчёт в калькуляторе — и здесь появится живая картина месяца: сколько можно тратить, сколько осталось, плюс разовые доходы и траты."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {onAppPage ? (
            <Button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Заполнить цифры выше
            </Button>
          ) : (
            <Button asChild>
              <a href="/app">Открыть калькулятор</a>
            </Button>
          )}
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
      <CardContent className="space-y-5">
        {/* Онбординг — мини-подсказка при первом входе */}
        {hint && s?.hasBudget && (
          <div className="flex items-start justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <span>
              💡 Записывайте траты кнопкой <b>➖ Трата</b> ниже, переключайте <b>шаблоны</b> сверху, а <b>＋ Новый</b> — добавит расчёт.
            </span>
            <button type="button" aria-label="Скрыть" onClick={dismissHint} className="shrink-0 hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Шаблоны: выбрать активный, переименовать (двойной клик), удалить (×), создать новый */}
        {templates.length > 0 && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {templates.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "group relative shrink-0 rounded-xl border transition-colors",
                  t.active
                    ? "border-primary bg-primary/15 shadow-[0_0_0_1px_hsl(var(--primary))]"
                    : "border-border/60 hover:border-primary/50",
                )}
              >
                <button
                  type="button"
                  disabled={activating === t.id}
                  onClick={() => !t.active && activate(t.id)}
                  onDoubleClick={() => renameTemplate(t.id, t.label ?? "")}
                  title="Двойной клик — переименовать"
                  className={cn(
                    "block px-3 py-2 pr-7 text-left text-xs disabled:opacity-60",
                    t.active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="block font-medium">{t.label || "Расчёт"}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {activating === t.id ? "переключаем…" : `${t.active ? "активный · " : ""}${fmt(t.free ?? 0)} своб.`}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Удалить шаблон"
                  onClick={() => delTemplate(t.id)}
                  className="absolute right-1 top-1 rounded-md p-1 text-muted-foreground/60 hover:text-[hsl(var(--danger))]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <a
              href="/app"
              className="flex shrink-0 items-center gap-1 rounded-xl border border-dashed border-border/60 px-3 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-primary"
            >
              <Plus className="h-4 w-4" /> Новый
            </a>
          </div>
        )}

        {s && (
          <div className="cabinet-glow rounded-2xl border border-border/60 bg-gradient-to-b from-primary/[0.07] to-transparent p-5">
            {/* Аналитический круг: категории + центр день/месяц */}
            <AnalyticsRing
              remaining={s.remaining}
              perDay={s.perDay}
              base={s.base}
              over={over}
              daysLeft={s.daysLeft}
              cycleMode={cycle}
              nextPayday={s.nextPayday}
              categories={s.categories}
            />

            {/* Сегодня: можно потратить / уже потрачено */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/[0.07] p-3 text-center">
                <p className="text-[11px] text-muted-foreground">Можно сегодня</p>
                <p className="mt-0.5 text-lg font-bold text-[hsl(var(--success))] tabular-nums">
                  {fmt(s.perDay)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">Потрачено сегодня</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums">{fmt(s.spentToday)}</p>
              </div>
            </div>

            {/* Как считается «в день» */}
            <p
              className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground"
              title={
                cycle
                  ? "В режиме «до зарплаты»: (остаток на счёте − подушка − траты + доходы) ÷ дней до зарплаты."
                  : "В режиме месяца: свободно (доход − обязательные − откладываю) ÷ дней в месяце. Укажите день зарплаты в калькуляторе для расчёта от остатка на счёте."
              }
            >
              <HelpCircle className="h-3 w-3" />
              {cycle ? "Считаем от остатка на счёте до зарплаты" : "Свободно ÷ дней в месяце"}
            </p>

            {/* Чипы со сводкой */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label={firstLabel} value={fmt(firstValue)} />
              <Stat label="Потрачено" value={fmt(s.spentMonth)} tone="danger" />
              <Stat label="Доп. доход" value={s.extraIncome > 0 ? `+${fmt(s.extraIncome)}` : "—"} tone="success" />
            </div>

            {s.goalName && s.goalRemaining > 0 && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                🎯 До цели «{s.goalName}» осталось накопить <b>{fmt(s.goalRemaining)}</b>
              </p>
            )}

            {s.purchase && s.purchase.price > 0 && (
              <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 p-3 text-center text-sm">
                🛒 Покупка <b>{fmt(s.purchase.price)}</b>
                {s.purchase.gap <= 0 ? (
                  <span className="text-[hsl(var(--success))]"> — хватает на счёте ✅</span>
                ) : s.purchase.months ? (
                  <span className="text-muted-foreground">
                    {" "}
                    — не хватает {fmt(s.purchase.gap)}, накопите за {s.purchase.months} мес.
                  </span>
                ) : (
                  <span className="text-muted-foreground"> — не хватает {fmt(s.purchase.gap)}</span>
                )}
              </div>
            )}

            {/* Подключите напоминания */}
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-center">
              <p className="text-xs font-medium text-foreground">
                🔔 Получайте напоминания, сколько можно потратить
              </p>
              <div className="mt-2 flex justify-center gap-2">
                <a
                  href="/account#telegram"
                  className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium hover:text-primary"
                >
                  В Telegram
                </a>
                <a
                  href="/install"
                  className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium hover:text-primary"
                >
                  Скачать приложение
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Добавить разовую сумму */}
        <div className="space-y-2">
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setKind("expense")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-base font-semibold transition-all active:scale-[0.98]",
                kind === "expense"
                  ? "border-[hsl(var(--danger))] bg-[hsl(var(--danger))]/15 text-[hsl(var(--danger))] shadow-[0_4px_16px_hsl(var(--danger)/0.25)]"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              <Minus className="h-5 w-5" /> Трата
            </button>
            <button
              type="button"
              onClick={() => setKind("income")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-base font-semibold transition-all active:scale-[0.98]",
                kind === "income"
                  ? "border-[hsl(var(--success))] bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] shadow-[0_4px_16px_hsl(var(--success)/0.25)]"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              <Plus className="h-5 w-5" /> Доход
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
