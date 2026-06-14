import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEV_AUTH_COOKIE, isDevAuthSession } from "@/lib/dev-auth";

/**
 * Есть ли у посетителя платный доступ к полной версии калькулятора.
 *
 * Сейчас доступ = наличие сессии (пользователь получает логин после оплаты).
 * TODO (backend): сверять с оплаченным заказом в Supabase, а не только факт сессии.
 */
export async function hasPaidAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  if (isDevAuthSession(cookieStore.get(DEV_AUTH_COOKIE)?.value)) {
    return true;
  }

  // Быстрый выход: если нет куки сессии Supabase — пользователь не залогинен,
  // не делаем медленный сетевой запрос к supabase.co.
  const hasSbCookie = cookieStore.getAll().some((c) => c.name.includes("-auth-token"));
  if (!hasSbCookie) return false;

  const supabase = await createClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return Boolean(user);
}
