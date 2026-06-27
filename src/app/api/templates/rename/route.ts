import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { hasPaidAccess } from "@/lib/access";
import { renameTemplate, listAccountTemplates } from "@/lib/telegram-bot";

/** Переименовать шаблон: { id, label }. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });
  if (!(await hasPaidAccess())) return NextResponse.json({ error: "payment required" }, { status: 403 });

  let body: { id?: string; label?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.id || !body.label) return NextResponse.json({ error: "bad input" }, { status: 400 });

  await renameTemplate(user.id, body.id, body.label);
  const templates = await listAccountTemplates(user.id);
  return NextResponse.json({ templates });
}
