import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { isTelegramConfigured } from "@/lib/telegram";
import { sendDailyReminders, sendPushReminders } from "@/lib/telegram-bot";

/**
 * Триггер ежедневных напоминаний. Дёргается поллером (scripts/bot-poll.mjs)
 * раз в несколько минут; сама функция шлёт сводку только в окне МСК 9–11 и
 * не чаще раза в день на пользователя.
 *
 * Защита: заголовок x-telegram-bot-api-secret-token === TELEGRAM_WEBHOOK_SECRET.
 * ?force=1 — отправить прямо сейчас, игнорируя проверку часа (ручной тест).
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  if (!isSupabaseAdminConfigured()) {
    return Response.json({ ok: false, reason: "not configured" });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  try {
    // Telegram-сводка (если бот настроен) + web-push в приложении — независимо
    const tg = isTelegramConfigured() ? await sendDailyReminders(force) : { sent: 0, skipped: "tg off" };
    const push = await sendPushReminders(force);
    if (tg.sent > 0 || push.sent > 0 || force) {
      console.log("cron: tg", tg.sent, tg.skipped, "| push", push.sent, push.skipped);
    }
    return Response.json({ ok: true, tg, push });
  } catch (e) {
    console.error("cron: ошибка →", (e as Error).message);
    return Response.json({ ok: false, error: (e as Error).message });
  }
}
