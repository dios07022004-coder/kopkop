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

for (const t of ["profiles", "orders", "calculations", "telegram_users", "tg_link_codes", "tg_expenses"]) {
  const { error } = await admin.from(t).select("*").limit(1);
  console.log(error ? `❌ ${t}: ${error.message}` : `✅ ${t}`);
}
