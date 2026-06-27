"use client";

import { useEffect, useState, type ReactNode } from "react";
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
const dayWord = (n: number) =>
  n % 10 === 1 && n % 100 !== 11
    ? "день"
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? "дня"
      : "дней";

/** Кольцевой индикатор остатка (SVG, без зависимостей). */
function Ring({
  remaining,
  base,
  over,
  children,
}: {
  remaining: number;
  base: number;
  over: boolean;
  children: ReactNode;
}) {
  const size = 156;
  const sw = 13;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const frac = base > 0 ? Math.max(0, Math.min(1, remaining / base)) : over ? 1 : 0;
  const color = over || frac < 0.15 ? "hsl(var(--danger))" : frac < 0.4 ? "#f59e0b" : "hsl(var(--success))";
  const dash = (over ? 1 : frac) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

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

  const activate = async (id: string) => {
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
      }
    } catch {
      /* ignore */
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
        {/* Шаблоны: выбрать активный (сверху) */}
        {templates.length > 1 && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => !t.active && activate(t.id)}
                className={cn(
                  "shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                  t.active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="block font-medium">{t.label || "Расчёт"}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {t.active ? "активный · " : ""}
                  {fmt(t.free ?? 0)} своб.
                </span>
              </button>
            ))}
          </div>
        )}

        {s && (
          <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-primary/[0.06] to-transparent p-5">
            {/* Кольцо-индикатор: сколько ещё можно тратить */}
            <div className="flex flex-col items-center">
              <Ring remaining={s.remaining} base={s.base} over={over}>
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {over ? "Перерасход" : "Осталось"}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-2xl font-extrabold tabular-nums",
                    over && "text-[hsl(var(--danger))]",
                  )}
                >
                  {over ? `−${fmt(-s.remaining)}` : fmt(s.remaining)}
                </span>
                <span className="mt-0.5 text-xs text-muted-foreground">
                  ≈ {fmt(s.perDay)}/день
                </span>
              </Ring>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                {cycle && s.nextPayday
                  ? `До зарплаты ${fmtDate(s.nextPayday)} · ${s.daysLeft} ${dayWord(s.daysLeft)}`
                  : `Осталось ${s.daysLeft} ${dayWord(s.daysLeft)} до конца месяца`}
              </p>
            </div>

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
