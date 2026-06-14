import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { isTelegramConfigured } from "@/lib/telegram";
import { handleMessage } from "@/lib/telegram-bot";

export async function POST(request: Request) {
  // Безопасность: секрет вебхука Telegram
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    console.error("tg webhook: 403 — секрет не совпал");
    return new Response("forbidden", { status: 403 });
  }
  if (!isTelegramConfigured() || !isSupabaseAdminConfigured()) {
    console.error(
      "tg webhook: не сконфигурирован — token?",
      isTelegramConfigured(),
      "supabase?",
      isSupabaseAdminConfigured(),
    );
    return Response.json({ ok: true });
  }

  try {
    const update = await request.json();
    const msg = update?.message;
    if (msg?.text && msg.chat?.id) {
      console.log("tg webhook: обрабатываю", msg.chat.id, msg.text);
      await handleMessage(msg.chat.id, msg.text);
      console.log("tg webhook: обработано", msg.chat.id);
    }
  } catch (e) {
    console.error("tg webhook: ошибка обработки →", (e as Error).message);
    /* всегда отвечаем 200, чтобы Telegram не ретраил бесконечно */
  }
  return Response.json({ ok: true });
}
