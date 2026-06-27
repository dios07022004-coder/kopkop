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

  const size = 320;
  const sw = 30;
  const r = (size - sw) / 2 - 8;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  const r2 = r - sw - 6; // «эхо»-дуги для слоистого вида (как в референсе)
  const sw2 = 9;
  const c2 = 2 * Math.PI * r2;

  const segs = categories.filter((s) => s.amount > 0);
  const total = segs.reduce((s, x) => s + x.amount, 0) || 1;
  let offset = 0;
  let offset2 = 0;

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
      {/* премиальный переключатель день/месяц */}
      <div className="mb-5 inline-flex rounded-full border border-border/60 bg-muted/50 p-1 text-sm shadow-inner">
        {(["day", "month"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-5 py-2 font-semibold transition-all ${
              mode === m
                ? "bg-primary text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/0.4)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "day" ? "В день" : "В месяц"}
          </button>
        ))}
      </div>

      <div className="relative aspect-square w-full max-w-[360px]">
        {/* живое вращающееся свечение (конусный градиент категорий) */}
        <div
          className="animate-spin-slow absolute -inset-3 -z-10 rounded-full opacity-70 blur-2xl"
          style={{
            background: over
              ? "conic-gradient(from 0deg, hsl(0 75% 50% / 0.4), transparent 60%)"
              : `conic-gradient(from 0deg, ${PALETTE.map((c, i) => `${c.replace(")", " / 0.34)")} ${(i / PALETTE.length) * 360}deg`).join(", ")})`,
          }}
        />
        <div
          className="animate-pulse-soft absolute inset-6 -z-10 rounded-full blur-xl"
          style={{ background: over ? "hsl(0 75% 50% / 0.15)" : "hsl(var(--primary) / 0.2)" }}
        />
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          {/* концентрические направляющие — слоистый радиальный вид */}
          {[r + sw / 2 + 12, r + sw / 2 + 6, r, r - sw / 2 - 6, r2, r2 - sw2].map((rr, i) => (
            <circle key={i} cx={cx} cy={cy} r={rr} fill="none" stroke="hsl(var(--border))" strokeWidth={1} opacity={0.3} />
          ))}
          {/* фон внешнего кольца */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={sw} />
          {/* внешнее кольцо — сегменты категорий */}
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
                  filter: `drop-shadow(0 0 7px ${PALETTE[i % PALETTE.length]}66)`,
                }}
              />
            );
            offset += len;
            return el;
          })}
          {/* внутреннее «эхо»-кольцо (слоистость как в референсе) */}
          {segs.map((seg, i) => {
            const len = (seg.amount / total) * c2;
            const dash = `${len} ${c2 - len}`;
            const el = (
              <circle
                key={`e-${seg.label}`}
                cx={cx}
                cy={cy}
                r={r2}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={sw2}
                strokeLinecap="butt"
                strokeDasharray={drawn ? dash : `0 ${c2}`}
                strokeDashoffset={-offset2}
                opacity={0.4}
                style={{
                  transition: "stroke-dasharray 0.9s cubic-bezier(0.22,1,0.36,1)",
                  transitionDelay: `${i * 90 + 120}ms`,
                }}
              />
            );
            offset2 += len;
            return el;
          })}
        </svg>
        {/* центр */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {over ? "Перерасход" : "Можно тратить"}
          </span>
          <span
            className={`mt-1 text-3xl font-extrabold tabular-nums sm:text-4xl ${over ? "text-[hsl(var(--danger))]" : ""}`}
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
