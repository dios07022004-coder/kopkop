import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { hasPaidAccess } from "@/lib/access";
import { activateTemplate, getMonthEntries, listAccountTemplates } from "@/lib/telegram-bot";

/** Сделать сохранённый расчёт активным шаблоном: { id }. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });
  if (!(await hasPaidAccess())) return NextResponse.json({ error: "payment required" }, { status: 403 });

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "bad id" }, { status: 400 });

  try {
    const summary = await activateTemplate(user.id, body.id);
    const [entries, templates] = await Promise.all([getMonthEntries(user.id), listAccountTemplates(user.id)]);
    return NextResponse.json({ summary, entries, templates });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
