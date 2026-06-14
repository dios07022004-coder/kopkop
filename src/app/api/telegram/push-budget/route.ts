import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { pushBudgetToBot } from "@/lib/telegram-bot";

/**
 * Прокидывает свежий бюджет/цель из последнего расчёта в Telegram-бота и шлёт
 * отчёт. Вызывается клиентом после сохранения расчёта. Если бот не привязан —
 * тихий no-op (pushed: false).
 */
export async function POST() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ pushed: false }, { status: 200 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ pushed: false });

  try {
    const pushed = await pushBudgetToBot(user.id);
    return NextResponse.json({ pushed });
  } catch (e) {
    console.error("push-budget error:", (e as Error).message);
    return NextResponse.json({ pushed: false });
  }
}
