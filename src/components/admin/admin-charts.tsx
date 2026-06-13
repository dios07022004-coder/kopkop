import { formatRub } from "@/lib/utils";

export interface DayPoint {
  label: string;
  total: number;
  paid: number;
}

export interface SourcePoint {
  source: string;
  count: number;
  paid: number;
  revenue: number;
}

/** Столбики: заказы по дням (серый — все, зелёный — оплаченные). */
export function DailyBars({ data }: { data: DayPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="soft-card p-5">
      <p className="font-semibold">Заказы по дням (14 дней)</p>
      <div className="mt-4 flex h-40 items-end gap-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end justify-center">
              <div
                className="relative flex w-full max-w-[22px] items-end justify-center rounded-t bg-muted"
                style={{ height: `${(d.total / max) * 100}%` }}
                title={`${d.label}: всего ${d.total}, оплат ${d.paid}`}
              >
                {d.paid > 0 && (
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-primary"
                    style={{ height: `${(d.paid / Math.max(1, d.total)) * 100}%` }}
                  />
                )}
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-muted" /> Все заказы
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Оплачено
        </span>
      </div>
    </div>
  );
}

/** Горизонтальные бары: источники трафика (UTM). */
export function SourceBars({ data }: { data: SourcePoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="soft-card p-5">
      <p className="font-semibold">Откуда приходят (источники / UTM)</p>
      {data.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Пока нет данных по источникам.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.map((d) => (
            <li key={d.source}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{d.source}</span>
                <span className="text-muted-foreground">
                  {d.count} заказ(ов) · {d.paid} оплат · {formatRub(d.revenue)}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
