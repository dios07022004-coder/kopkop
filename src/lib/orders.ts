import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { GOOGLE_SHEETS_TEMPLATE } from "@/data/content";
import type { Order, OrderStatus, UtmParams } from "@/types";

/* ───────────────────────────────────────────────────────────
   Заказы хранятся в Supabase (таблица public.orders).
   Если Supabase не настроен (локальная разработка) — fallback в JSON-файл.
   На проде/хостинге всегда используется Supabase (JSON эфемерен и не годится).
   ─────────────────────────────────────────────────────────── */

type OrderRow = {
  id: string;
  email: string;
  full_name: string | null;
  amount: number;
  status: OrderStatus;
  yookassa_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
};

function rowToOrder(r: OrderRow): Order {
  return {
    id: r.id,
    email: r.email,
    name: r.full_name ?? "",
    amount: r.amount,
    status: r.status,
    yookassaPaymentId: r.yookassa_payment_id ?? undefined,
    createdAt: r.created_at,
    paidAt: r.paid_at ?? undefined,
    utm: {
      source: r.utm_source ?? undefined,
      medium: r.utm_medium ?? undefined,
      campaign: r.utm_campaign ?? undefined,
      content: r.utm_content ?? undefined,
    },
  };
}

const dbEnabled = () => isSupabaseAdminConfigured();

/* ── Supabase implementation ── */

async function dbCreate(
  email: string,
  name: string,
  amount: number,
  utm?: UtmParams,
): Promise<Order> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      email,
      full_name: name,
      amount,
      status: "pending",
      utm_source: utm?.source ?? null,
      utm_medium: utm?.medium ?? null,
      utm_campaign: utm?.campaign ?? null,
      utm_content: utm?.content ?? null,
    })
    .select()
    .single();
  if (error || !data) throw new Error(`Не удалось создать заказ: ${error?.message}`);
  return rowToOrder(data as OrderRow);
}

async function dbGetById(id: string): Promise<Order | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("orders").select().eq("id", id).maybeSingle();
  return data ? rowToOrder(data as OrderRow) : null;
}

async function dbGetByPaymentId(paymentId: string): Promise<Order | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select()
    .eq("yookassa_payment_id", paymentId)
    .maybeSingle();
  return data ? rowToOrder(data as OrderRow) : null;
}

async function dbUpdate(
  id: string,
  status: OrderStatus,
  yookassaPaymentId?: string,
): Promise<Order | null> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = { status };
  if (yookassaPaymentId) patch.yookassa_payment_id = yookassaPaymentId;
  if (status === "paid") patch.paid_at = new Date().toISOString();
  const { data } = await supabase.from("orders").update(patch).eq("id", id).select().maybeSingle();
  return data ? rowToOrder(data as OrderRow) : null;
}

async function dbGetAll(): Promise<Order[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select()
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []).map((r) => rowToOrder(r as OrderRow));
}

/* ── JSON fallback (local dev only) ── */

const ORDERS_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(ORDERS_DIR, "orders.json");

async function readOrders(): Promise<Order[]> {
  try {
    return JSON.parse(await fs.readFile(ORDERS_FILE, "utf-8")) as Order[];
  } catch {
    return [];
  }
}

async function writeOrders(orders: Order[]): Promise<void> {
  await fs.mkdir(ORDERS_DIR, { recursive: true });
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
}

/* ── Public API (signature unchanged) ── */

export async function createOrder(
  email: string,
  name: string,
  amount: number,
  utm?: UtmParams,
): Promise<Order> {
  if (dbEnabled()) return dbCreate(email, name, amount, utm);
  const orders = await readOrders();
  const order: Order = {
    id: uuidv4(),
    email,
    name,
    amount,
    status: "pending",
    createdAt: new Date().toISOString(),
    utm,
  };
  orders.push(order);
  await writeOrders(orders);
  return order;
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (dbEnabled()) return dbGetById(id);
  return (await readOrders()).find((o) => o.id === id) ?? null;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  yookassaPaymentId?: string,
): Promise<Order | null> {
  if (dbEnabled()) return dbUpdate(id, status, yookassaPaymentId);
  const orders = await readOrders();
  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) return null;
  orders[index] = {
    ...orders[index],
    status,
    yookassaPaymentId: yookassaPaymentId ?? orders[index].yookassaPaymentId,
    paidAt: status === "paid" ? new Date().toISOString() : orders[index].paidAt,
  };
  await writeOrders(orders);
  return orders[index];
}

export async function getOrderByPaymentId(paymentId: string): Promise<Order | null> {
  if (dbEnabled()) return dbGetByPaymentId(paymentId);
  return (await readOrders()).find((o) => o.yookassaPaymentId === paymentId) ?? null;
}

/** Для админки: все заказы (только Supabase). */
export async function getAllOrders(): Promise<Order[]> {
  if (dbEnabled()) return dbGetAll();
  return (await readOrders()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getProductPrice(): number {
  return Number(process.env.PRODUCT_PRICE ?? 399);
}

export function getProductLinks() {
  return {
    googleSheets: process.env.PRODUCT_GOOGLE_SHEETS_URL ?? GOOGLE_SHEETS_TEMPLATE.viewUrl,
    excel: "/api/downloads/budget-tracker-template.xlsx",
    instruction: "/api/downloads/instruction.html",
    /** @deprecated use instruction */
    pdf: "/api/downloads/instruction.html",
  };
}
