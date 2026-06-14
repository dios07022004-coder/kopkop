import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getMonthSummaryByUser, getMonthEntries } from "@/lib/telegram-bot";

/** Сводка месяца аккаунта + записи леджера (траты и разовые доходы). */
export async function GET() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const [summary, entries] = await Promise.all([
    getMonthSummaryByUser(user.id),
    getMonthEntries(user.id),
  ]);
  return NextResponse.json({ summary, entries });
}
