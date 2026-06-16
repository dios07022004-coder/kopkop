import webpush from "web-push";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * Web Push — уведомления приложения (PWA) без Telegram. Утренняя сводка и
 * напоминания шлются оплатившим, у кого включены пуши. Ключи — VAPID.
 */

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

let configured = false;
function ensureVapid() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:noreply@kapkapmoney.ru",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
  configured = true;
}

type SubRow = { id: number; endpoint: string; p256dh: string; auth: string };

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

/** Сохранить подписку браузера для пользователя. */
export async function saveSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  const supabase = createAdminClient();
  await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" },
  );
}

export async function deleteSubscription(endpoint: string) {
  const supabase = createAdminClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

/** Отправить пуш на все подписки пользователя. Просроченные (404/410) удаляем. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!isPushConfigured() || !isSupabaseAdminConfigured()) return 0;
  ensureVapid();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", userId);
  const subs = (data ?? []) as SubRow[];
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await deleteSubscription(s.endpoint);
    }
  }
  return sent;
}
