"use client";

import { useEffect, useRef, useState } from "react";

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const fmtDate = (ymd: string) => `${ymd.slice(8, 10)}.${ymd.slice(5, 7)}`;

/** Плавный счётчик числа (для центра круга). */
function useCountUp(value: number, ms = 520) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    let raf = 0;
    const tick = (t: number) => {
      if (!startRef.current) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        fromRef.current = to;
        startRef.current = 0;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return display;
}

// Премиальная палитра сегментов (тёмная тема, насыщенные тона со свечением)
const PALETTE = [
  "hsl(158 70% 48%)", // зелёный — бренд
  "hsl(190 75% 52%)", // циан
  "hsl(40 95% 58%)", // золотой
  "hsl(265 70% 66%)", // фиолетовый
  "hsl(210 80% 60%)", // синий
  "hsl(0 80% 64%)", // красный
];

type Category = { label: string; amount: number; percent: number };

/**
 * Большой аналитический круг кабинета: сегменты по категориям трат
 * (на что можно тратить), в центре — «можно тратить» с переключателем День/Месяц.
 * Концентрические направляющие + свечение в духе референса (тёмный фон).
 */
export function AnalyticsRing({
  remaining,
  perDay,
  base,
  over,
  daysLeft,
  cycleMode,
  nextPayday,
  categories,
}: {
  remaining: number;
  perDay: number;
  base: number;
  over: boolean;
  daysLeft: number;
  cycleMode: boolean;
  nextPayday: string | null;
  categories: Category[];
}) {
  const [mode, setMode] = useState<"day" | "month">("month");
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 80);
    return () => clearTimeout(t);
  }, []);

  const size = 260;
  const sw = 26;
  const r = (size - sw) / 2 - 6;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const segs = categories.filter((s) => s.amount > 0);
  const total = segs.reduce((s, x) => s + x.amount, 0) || 1;
  let offset = 0;

  const centerValueRaw = mode === "day" ? perDay : Math.max(0, remaining);
  const centerValue = useCountUp(centerValueRaw);
  const centerSub =
    mode === "day"
      ? `в день${cycleMode && nextPayday ? ` · до ${fmtDate(nextPayday)}` : ""}`
      : cycleMode && nextPayday
        ? `до зарплаты ${fmtDate(nextPayday)} · ${daysLeft} дн.`
        : `на месяц · ${daysLeft} дн.`;

  return (
    <div className="flex flex-col items-center">
      {/* переключатель день/месяц */}
      <div className="mb-4 inline-flex rounded-full border border-border/60 bg-muted/40 p-0.5 text-xs">
        {(["day", "month"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {m === "day" ? "В день" : "В месяц"}
          </button>
        ))}
      </div>

      <div className="relative" style={{ width: size, height: size }}>
        {/* живое вращающееся свечение (конусный градиент категорий) */}
        <div
          className="animate-spin-slow absolute -inset-2 -z-10 rounded-full opacity-60 blur-2xl"
          style={{
            background: over
              ? "conic-gradient(from 0deg, hsl(0 75% 50% / 0.35), transparent 60%)"
              : `conic-gradient(from 0deg, ${PALETTE.map((c, i) => `${c.replace(")", " / 0.30)")} ${(i / PALETTE.length) * 360}deg`).join(", ")})`,
          }}
        />
        <div
          className="animate-pulse-soft absolute inset-4 -z-10 rounded-full blur-xl"
          style={{ background: over ? "hsl(0 75% 50% / 0.15)" : "hsl(var(--primary) / 0.18)" }}
        />
        <svg width={size} height={size} className="-rotate-90">
          {/* концентрические направляющие — слоистый радиальный вид */}
          {[r + sw / 2 + 10, r + sw / 2 + 5, r, r - sw / 2 - 5, r - sw / 2 - 10].map((rr, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={rr}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={1}
              opacity={0.35}
            />
          ))}
          {/* фон кольца */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={sw} />
          {/* сегменты категорий */}
          {segs.map((seg, i) => {
            const len = (seg.amount / total) * c;
            const dash = `${len} ${c - len}`;
            const el = (
              <circle
                key={seg.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={sw}
                strokeLinecap="butt"
                strokeDasharray={drawn ? dash : `0 ${c}`}
                strokeDashoffset={-offset}
                style={{
                  transition: "stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)",
                  transitionDelay: `${i * 90}ms`,
                  filter: `drop-shadow(0 0 6px ${PALETTE[i % PALETTE.length]}55)`,
                }}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        {/* центр */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {over ? "Перерасход" : "Можно тратить"}
          </span>
          <span
            className={`mt-1 text-3xl font-extrabold tabular-nums ${over ? "text-[hsl(var(--danger))]" : ""}`}
          >
            {over && mode === "month" ? `−${fmt(-remaining)}` : fmt(centerValue)}
          </span>
          <span className="mt-1 max-w-[60%] text-[11px] leading-tight text-muted-foreground">{centerSub}</span>
        </div>
      </div>

      {/* легенда категорий */}
      {segs.length > 0 && (
        <ul className="mt-5 grid w-full grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {segs.map((seg, i) => (
            <li
              key={seg.label}
              className="animate-float-in flex items-center gap-2"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: PALETTE[i % PALETTE.length],
                  boxShadow: `0 0 8px ${PALETTE[i % PALETTE.length]}88`,
                }}
              />
              <span className="flex-1 truncate text-muted-foreground">{seg.label}</span>
              <span className="font-semibold tabular-nums">{fmt(seg.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
