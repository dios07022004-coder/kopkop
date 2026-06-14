import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEV_AUTH_COOKIE, isDevAuthSession } from "@/lib/dev-auth";
import { isAdminEmail } from "@/lib/admin";
import { userHasPaidOrder } from "@/lib/orders";

/**
 * Доступ к полной версии калькулятора:
 *  • админ (ADMIN_EMAILS) — всегда;
 *  • обычный пользователь — только при наличии ОПЛАЧЕННОГО заказа на его email;
 *  • dev-режим — всегда (локально).
 */
export async function hasPaidAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  if (isDevAuthSession(cookieStore.get(DEV_AUTH_COOKIE)?.value)) {
    return true;
  }

  // Нет куки сессии → не залогинен → не ходим в сеть.
  const hasSbCookie = cookieStore.getAll().some((c) => c.name.includes("-auth-token"));
  if (!hasSbCookie) return false;

  const supabase = await createClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email;
  if (!email) return false;

  // Админ — всегда; остальные — только после оплаты.
  if (isAdminEmail(email)) return true;
  return userHasPaidOrder(email);
}
