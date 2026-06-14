import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { isTelegramConfigured } from "@/lib/telegram";
import { sendDailyReminders } from "@/lib/telegram-bot";

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
  if (!isTelegramConfigured() || !isSupabaseAdminConfigured()) {
    return Response.json({ ok: false, reason: "not configured" });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  try {
    const res = await sendDailyReminders(force);
    if (res.sent > 0 || force) console.log("tg cron: отправлено напоминаний", res.sent, res.skipped);
    return Response.json({ ok: true, ...res });
  } catch (e) {
    console.error("tg cron: ошибка →", (e as Error).message);
    return Response.json({ ok: false, error: (e as Error).message });
  }
}
