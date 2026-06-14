import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { deleteEntry, getMonthEntries } from "@/lib/telegram-bot";

/** Удалить запись леджера (только свою): { id }. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });

  let body: { id?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!id || !Number.isFinite(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const summary = await deleteEntry(user.id, id);
  const entries = await getMonthEntries(user.id);
  return NextResponse.json({ summary, entries });
}
