// Анализ уведомлений для аккаунта. Запуск НА СЕРВЕРЕ (там .env.local указывает на нужный проект):
//   node scripts/test-notifications.mjs dios07022004@gmail.com
import fs from "node:fs";
import path from "node:path";
// Node 20 без нативного WebSocket → полифилл из ws (для @supabase/supabase-js)
try { const ws = await import("ws"); if (!globalThis.WebSocket) globalThis.WebSocket = ws.default || ws.WebSocket; } catch {}
import { createClient } from "@supabase/supabase-js";

const email = (process.argv[2] || "dios07022004@gmail.com").toLowerCase();
const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const ADMIN = (env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase());

console.log("Проект:", env.NEXT_PUBLIC_SUPABASE_URL);
console.log("Аккаунт:", email, "\n");

// 1) пользователь
const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
const u = (users?.users ?? []).find((x) => x.email?.toLowerCase() === email);
console.log("1) Аккаунт существует:", u ? "✅ " + u.id : "❌ нет");
if (!u) process.exit(0);

// 2) доступ (подписка)
const isAdmin = ADMIN.includes(email);
const { data: paid } = await admin.from("orders").select("id").ilike("email", email).eq("status", "paid").limit(1);
const hasPaid = isAdmin || (paid && paid.length > 0);
console.log("2) Доступ (подписка):", hasPaid ? "✅ есть" + (isAdmin ? " (админ)" : "") : "❌ нет — уведомления НЕ шлются");

// 3) Telegram-бот
const { data: tg } = await admin.from("telegram_users").select("tg_id,income,remind_daily,last_remind_on,payday").eq("user_id", u.id).maybeSingle();
console.log(
  "3) Telegram привязан:",
  tg ? `✅ chat ${tg.tg_id} · бюджет ${tg.income > 0 ? "есть" : "нет"} · напоминания ${tg.remind_daily ? "вкл" : "выкл"} · payday ${tg.payday || "—"}` : "❌ не привязан",
);

// 4) Web-push
const { data: subs } = await admin.from("push_subscriptions").select("id,last_push_on").eq("user_id", u.id);
console.log("4) Web-push подписки:", subs && subs.length ? `✅ ${subs.length} устройств(а)` : "❌ нет (кнопка «Включить напоминания» не нажата)");

// 5) VAPID настроен?
console.log("5) VAPID-ключи в env:", env.VAPID_PRIVATE_KEY ? "✅ есть" : "❌ нет — web-push не работает");

console.log("\nИтог: уведомления придут, если (2) доступ есть И есть канал — (3) Telegram или (4) web-push+(5)VAPID.");
