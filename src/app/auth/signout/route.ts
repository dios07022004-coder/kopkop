import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEV_AUTH_COOKIE } from "@/lib/dev-auth";

/** Выход: завершает сессию Supabase (чистит cookie) и возвращает на главную. */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  const res = NextResponse.redirect(`${origin}/`);
  res.cookies.delete(DEV_AUTH_COOKIE);
  return res;
}
