import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getProductPrice } from "@/lib/orders";

/**
 * Действия админки над пользователями и доступом («подпиской»).
 * Доступ = наличие оплаченного заказа (orders.status='paid') на email пользователя.
 * Вызывать только из роутов, защищённых getAdminUser().
 */

async function findUserByEmail(email: string) {
  const supabase = createAdminClient();
  const target = email.trim().toLowerCase();
  // у небольшой базы достаточно перебрать; perPage до 1000
  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return (data?.users ?? []).find((u) => u.email?.toLowerCase() === target) ?? null;
}

/** Создать аккаунт (email+пароль). Опционально сразу выдать доступ. */
export async function adminCreateUser(email: string, password: string, grant: boolean) {
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase не настроен");
  const supabase = createAdminClient();
  const normalized = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
  if (data.user) {
    await supabase.from("profiles").upsert({ id: data.user.id, email: normalized });
  }
  if (grant) await grantAccess(normalized);
  return { id: data.user?.id, email: normalized };
}

/** Сменить пароль пользователя по email. */
export async function adminSetPassword(email: string, password: string) {
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase не настроен");
  const user = await findUserByEmail(email);
  if (!user) throw new Error("Пользователь не найден");
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Выдать доступ («подписку») — создаём оплаченный заказ от админа. */
export async function grantAccess(email: string) {
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase не настроен");
  const supabase = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const { error } = await supabase.from("orders").insert({
    email: normalized,
    full_name: "",
    amount: getProductPrice(),
    status: "paid",
    paid_at: new Date().toISOString(),
    utm_source: "admin",
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Отозвать доступ — помечаем оплаченные заказы как failed (история сохраняется). */
export async function revokeAccess(email: string) {
  if (!isSupabaseAdminConfigured()) throw new Error("Supabase не настроен");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "failed" })
    .ilike("email", email.trim())
    .eq("status", "paid");
  if (error) throw new Error(error.message);
  return { ok: true };
}
