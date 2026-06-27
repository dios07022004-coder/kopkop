import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { hasPaidAccess } from "@/lib/access";
import { getMonthSummaryByUser, getMonthEntries, listAccountTemplates } from "@/lib/telegram-bot";

/** Сводка месяца аккаунта + записи леджера (траты и разовые доходы). */
export async function GET() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });
  if (!(await hasPaidAccess())) return NextResponse.json({ error: "payment required" }, { status: 403 });

  const [summary, entries, templates] = await Promise.all([
    getMonthSummaryByUser(user.id),
    getMonthEntries(user.id),
    listAccountTemplates(user.id),
  ]);
  return NextResponse.json({ summary, entries, templates });
}
