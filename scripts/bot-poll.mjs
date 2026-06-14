/**
 * Поллер Telegram-бота для РФ: api.telegram.org недоступен напрямую и Telegram
 * не может достучаться до сервера (webhook таймаутит). Поэтому сервер САМ тянет
 * апдейты через SOCKS5-прокси (getUpdates) и передаёт их в локальный обработчик
 * /api/telegram/webhook (переиспользуем всю логику бота).
 *
 * Запуск (из папки проекта):
 *   pm2 start scripts/bot-poll.mjs --name kopkop-bot
 */
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { SocksProxyAgent } from "socks-proxy-agent";

// .env.local
const env = {};
try {
  const raw = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
} catch {
  /* ignore */
}

const TOKEN = env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const PROXY = env.TELEGRAM_PROXY_URL || process.env.TELEGRAM_PROXY_URL;
const SECRET = env.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET || "";
const PORT = env.PORT || process.env.PORT || "3000";
const WEBHOOK = `http://127.0.0.1:${PORT}/api/telegram/webhook`;

if (!TOKEN || !PROXY) {
  console.error("bot-poll: нет TELEGRAM_BOT_TOKEN или TELEGRAM_PROXY_URL в .env.local");
  process.exit(1);
}

const agent = new SocksProxyAgent(PROXY);

function tgGet(method, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `https://api.telegram.org/bot${TOKEN}/${method}${qs ? "?" + qs : ""}`;
  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent, timeout: 65000 }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

async function relay(update) {
  await fetch(WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-telegram-bot-api-secret-token": SECRET,
    },
    body: JSON.stringify(update),
  }).catch(() => {});
}

async function main() {
  await tgGet("deleteWebhook", { drop_pending_updates: "false" }).catch(() => {});
  let offset = 0;
  console.log("bot-poll: запущен, тяну апдейты через прокси");
  for (;;) {
    try {
      const res = await tgGet("getUpdates", { offset, timeout: 50 });
      if (res && res.ok && Array.isArray(res.result)) {
        for (const upd of res.result) {
          offset = upd.update_id + 1;
          await relay(upd);
        }
      }
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main();
