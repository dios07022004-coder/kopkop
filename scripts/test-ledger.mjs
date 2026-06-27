// Проверка леджера: вставка трата+доход, чтение, очистка. Запуск: node scripts/test-ledger.mjs
import fs from "node:fs";
import path from "node:path";
try { const ws = await import("ws"); if (!globalThis.WebSocket) globalThis.WebSocket = ws.default || ws.WebSocket; } catch {}
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: users } = await admin.auth.admin.listUsers();
const user = users.users[0];
console.log("Тест на пользователе:", user?.email, user?.id);
const day = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);

const ins = [
  { user_id: user.id, amount: 1500, note: "тест трата", kind: "expense", source: "web", day },
  { user_id: user.id, amount: 5000, note: "тест доход", kind: "income", source: "web", day },
];
const { data: rows, error } = await admin.from("tg_expenses").insert(ins).select("id,kind,amount");
if (error) {
  console.log("❌ INSERT леджера:", error.message);
  console.log("→ Скорее всего НЕ применена миграция (колонки kind/source). Выполните SQL миграции.");
  process.exit(1);
}
console.log("✅ INSERT ok:", rows.map((r) => `${r.kind} ${r.amount}`).join(", "));

const monthStart = day.slice(0, 8) + "01";
const { data: agg } = await admin
  .from("tg_expenses")
  .select("amount,kind")
  .eq("user_id", user.id)
  .gte("day", monthStart);
let expense = 0, income = 0;
for (const r of agg) (r.kind === "income" ? (income += r.amount) : (expense += r.amount));
console.log(`✅ Агрегация месяца: трат ${expense}, доходов ${income}, net эффект ${income - expense}`);

// очистка
await admin.from("tg_expenses").delete().in("id", rows.map((r) => r.id));
console.log("✅ Тестовые записи удалены.");
