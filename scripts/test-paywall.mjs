// Проверка пейволла бота: для каждого пользователя — даст ли бот доступ.
// Повторяет логику hasPaidAccessForUser. Запуск: node scripts/test-paywall.mjs
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ADMIN = (env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const isAdmin = (email) => ADMIN.includes((email || "").toLowerCase());
async function hasPaid(email) {
  if (!email) return false;
  if (isAdmin(email)) return true;
  const { data } = await admin.from("orders").select("id").ilike("email", email).eq("status", "paid").limit(1);
  return Boolean(data && data.length);
}

console.log("ADMIN_EMAILS:", ADMIN.join(", ") || "(пусто)");

// 1) Привязанные Telegram-аккаунты
const { data: tgUsers } = await admin.from("telegram_users").select("tg_id,user_id,income");
console.log(`\nTelegram-пользователей: ${tgUsers?.length ?? 0}`);
for (const tu of tgUsers ?? []) {
  if (!tu.user_id) {
    console.log(`  tg ${tu.tg_id}: НЕ привязан → ❌ доступа НЕТ (верно)`);
    continue;
  }
  const { data } = await admin.auth.admin.getUserById(tu.user_id);
  const email = data?.user?.email;
  const access = await hasPaid(email);
  console.log(
    `  tg ${tu.tg_id}: ${email} → ${access ? "✅ доступ ЕСТЬ" : "❌ доступа НЕТ"}${isAdmin(email) ? " (админ)" : ""}`,
  );
}

// 2) Все пользователи аккаунтов — кто получит доступ в боте при привязке
const { data: users } = await admin.auth.admin.listUsers();
console.log(`\nВсе аккаунты (${users.users.length}):`);
for (const u of users.users) {
  const access = await hasPaid(u.email);
  console.log(`  ${u.email} → ${access ? "✅" : "❌"}${isAdmin(u.email) ? " (админ)" : ""}`);
}

// 3) Оплаченные заказы
const { data: paid } = await admin.from("orders").select("email,status").eq("status", "paid");
console.log(`\nОплаченных заказов: ${paid?.length ?? 0}`);
for (const o of paid ?? []) console.log(`  ${o.email}`);
