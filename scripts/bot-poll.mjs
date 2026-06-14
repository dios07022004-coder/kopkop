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
const CRON = `http://127.0.0.1:${PORT}/api/telegram/cron`;
const CRON_EVERY_MS = 10 * 60 * 1000; // раз в 10 минут дёргаем напоминания

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

let lastCronAt = 0;
async function tickCron() {
  if (Date.now() - lastCronAt < CRON_EVERY_MS) return;
  lastCronAt = Date.now();
  try {
    const r = await fetch(CRON, {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": SECRET },
    });
    const j = await r.json().catch(() => ({}));
    if (j && j.sent > 0) console.log("bot-poll: напоминаний отправлено", j.sent);
  } catch {
    /* ignore */
  }
}

async function main() {
  console.log("bot-poll: старт, прокси =", PROXY.replace(/:[^:@]+@/, ":***@"));

  // надёжно снимаем вебхук (иначе getUpdates конфликтует)
  try {
    const del = await tgGet("deleteWebhook", { drop_pending_updates: "false" });
    console.log("bot-poll: deleteWebhook →", JSON.stringify(del));
  } catch (e) {
    console.log("bot-poll: deleteWebhook ошибка →", e.message);
  }

  let offset = 0;
  console.log("bot-poll: тяну апдейты через прокси");
  for (;;) {
    await tickCron();
    try {
      const res = await tgGet("getUpdates", { offset, timeout: 30 });
      if (!res || !res.ok) {
        console.log("bot-poll: getUpdates не ok →", JSON.stringify(res));
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      for (const upd of res.result) {
        offset = upd.update_id + 1;
        const text = upd.message?.text;
        console.log("bot-poll: апдейт", upd.update_id, "chat", upd.message?.chat?.id, "text", text);
        await relay(upd);
      }
    } catch (e) {
      console.log("bot-poll: ошибка getUpdates →", e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main();
