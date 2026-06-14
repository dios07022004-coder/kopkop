import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import { getAllOrders } from "@/lib/orders";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { formatRub } from "@/lib/utils";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  DailyBars,
  SourceBars,
  type DayPoint,
  type SourcePoint,
} from "@/components/admin/admin-charts";
import { UtmBuilder } from "@/components/admin/utm-builder";
import type { Order } from "@/types";

export const metadata = buildPageMetadata({
  title: "Админ-панель",
  description: "Управление оплатами и пользователями",
  path: "/admin",
  noindex: true,
});

export const dynamic = "force-dynamic";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLE: Record<string, string> = {
  paid: "surface-success",
  pending: "surface-warning",
  failed: "surface-danger",
  cancelled: "surface-danger",
};

function buildDailyPoints(orders: Order[]): DayPoint[] {
  const days: DayPoint[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    const onDay = orders.filter((o) => o.createdAt.slice(0, 10) === key);
    days.push({
      label,
      total: onDay.length,
      paid: onDay.filter((o) => o.status === "paid").length,
    });
  }
  return days;
}

function buildSourcePoints(orders: Order[]): SourcePoint[] {
  const map = new Map<string, SourcePoint>();
  for (const o of orders) {
    const source = o.utm?.source || "прямой / без метки";
    const cur = map.get(source) ?? { source, count: 0, paid: 0, revenue: 0 };
    cur.count += 1;
    if (o.status === "paid") {
      cur.paid += 1;
      cur.revenue += o.amount;
    }
    map.set(source, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/login?next=/admin");

  const orders = await getAllOrders();
  const paid = orders.filter((o) => o.status === "paid");
  const revenue = paid.reduce((s, o) => s + o.amount, 0);
  const dailyPoints = buildDailyPoints(orders);
  const sourcePoints = buildSourcePoints(orders);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kapkapmoney.ru";

  let users: { email: string; created: string; lastSignIn: string | null }[] = [];
  if (isSupabaseAdminConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
      users = (data?.users ?? []).map((u) => ({
        email: u.email ?? "—",
        created: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
      }));
    } catch {
      users = [];
    }
  }

  return (
    <div className="page-container py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Админ-панель</h1>
          <p className="mt-1 text-sm text-muted-foreground">{admin.email}</p>
        </div>
      </div>

      {/* Сводка */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="soft-card p-5">
          <p className="text-sm text-muted-foreground">Выручка (оплачено)</p>
          <p className="mt-1 text-2xl font-bold text-primary">{formatRub(revenue)}</p>
        </div>
        <div className="soft-card p-5">
          <p className="text-sm text-muted-foreground">Оплат</p>
          <p className="mt-1 text-2xl font-bold">{paid.length}</p>
        </div>
        <div className="soft-card p-5">
          <p className="text-sm text-muted-foreground">Пользователей</p>
          <p className="mt-1 text-2xl font-bold">{users.length}</p>
        </div>
      </div>

      {/* Аналитика */}
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <DailyBars data={dailyPoints} />
        <SourceBars data={sourcePoints} />
      </section>

      {/* UTM-конструктор */}
      <section className="mt-6">
        <UtmBuilder baseUrl={siteUrl} />
      </section>

      {/* Оплаты */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Оплаты и заказы</h2>
        <div className="soft-card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border/60 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Имя</th>
                <th className="px-4 py-3 font-medium">Сумма</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Оплачено</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    Заказов пока нет
                  </td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                  <td className="px-4 py-3">{o.email}</td>
                  <td className="px-4 py-3">{o.name || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">{formatRub(o.amount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[o.status] ?? ""}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(o.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Пользователи */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Пользователи</h2>
        <div className="soft-card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-border/60 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Регистрация</th>
                <th className="px-4 py-3 font-medium">Последний вход</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    {isSupabaseAdminConfigured()
                      ? "Пользователей пока нет"
                      : "Supabase не настроен — список недоступен"}
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.email} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(u.created)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(u.lastSignIn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
