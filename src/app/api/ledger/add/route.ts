import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { addAdjustment, getMonthEntries } from "@/lib/telegram-bot";

/** Добавить разовую корректировку: { kind: 'expense'|'income', amount, note }. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });

  let body: { kind?: string; amount?: number; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const kind = body.kind === "income" ? "income" : "expense";
  const amount = Math.round(Math.abs(Number(body.amount)));
  if (!amount || amount <= 0 || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "Введите сумму больше 0" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 120) : null;

  try {
    const summary = await addAdjustment(user.id, kind, amount, note || null);
    const entries = await getMonthEntries(user.id);
    return NextResponse.json({ summary, entries });
  } catch (e) {
    console.error("ledger/add error:", (e as Error).message);
    return NextResponse.json({ error: "Не удалось сохранить. Применена ли миграция БД?" }, { status: 500 });
  }
}
