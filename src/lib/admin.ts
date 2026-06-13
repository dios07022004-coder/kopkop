import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Список email-адресов администраторов. Задаётся в env ADMIN_EMAILS
 * (через запятую). По умолчанию — владелец проекта.
 */
function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "dios07022004@gmail.com";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/** Текущий авторизованный пользователь, если он админ. Иначе null. */
export async function getAdminUser(): Promise<{ email: string } | null> {
  // фиксируем обращение к cookies, чтобы страница была динамической
  await cookies();
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && isAdminEmail(user.email)) {
    return { email: user.email! };
  }
  return null;
}
