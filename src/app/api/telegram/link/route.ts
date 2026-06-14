import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * Создаёт одноразовый код привязки Telegram к текущему аккаунту и возвращает
 * deep-link на бота: https://t.me/<bot>?start=<code>.
 */
export async function POST() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!botUsername || !isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Бот не настроен" }, { status: 503 });
  }

  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const admin = createAdminClient();
  await admin.from("tg_link_codes").insert({ code, user_id: user.id });

  return NextResponse.json({
    // tg:// открывает приложение Telegram напрямую (t.me заблокирован в РФ)
    appUrl: `tg://resolve?domain=${botUsername}&start=${code}`,
    webUrl: `https://t.me/${botUsername}?start=${code}`,
    username: botUsername,
    code,
  });
}
