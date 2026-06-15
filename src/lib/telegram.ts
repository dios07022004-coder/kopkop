import https from "https";
import { SocksProxyAgent } from "socks-proxy-agent";

/** Минимальный клиент Telegram Bot API.
 * Запросы к Telegram идут через SOCKS5-прокси (TELEGRAM_PROXY_URL), т.к. из РФ
 * api.telegram.org заблокирован. Всё остальное в приложении ходит напрямую. */

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

function api(method: string): string {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
}

let cachedAgent: SocksProxyAgent | undefined | null = null;
function proxyAgent(): SocksProxyAgent | undefined {
  if (cachedAgent !== null) return cachedAgent ?? undefined;
  const url = process.env.TELEGRAM_PROXY_URL;
  cachedAgent = url ? new SocksProxyAgent(url) : undefined;
  return cachedAgent ?? undefined;
}

/** POST в Telegram API. Через прокси (https.request) или напрямую (fetch). */
async function callTelegram(method: string, payload: unknown): Promise<void> {
  const body = JSON.stringify(payload);
  const agent = proxyAgent();

  if (!agent) {
    try {
      const r = await fetch(api(method), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const txt = await r.text();
      console.log(`tg ${method} (direct) → ${r.status} ${txt.slice(0, 300)}`);
    } catch (e) {
      console.error(`tg ${method} (direct) ошибка →`, (e as Error).message);
    }
    return;
  }

  await new Promise<void>((resolve) => {
    const req = https.request(
      api(method),
      {
        method: "POST",
        agent,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 15000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          console.log(`tg ${method} (proxy) → ${res.statusCode} ${data.slice(0, 300)}`);
          resolve();
        });
      },
    );
    req.on("error", (e) => {
      console.error(`tg ${method} (proxy) ошибка →`, e.message);
      resolve();
    });
    req.on("timeout", () => {
      console.error(`tg ${method} (proxy) → timeout`);
      req.destroy();
      resolve();
    });
    req.write(body);
    req.end();
  });
}

export type InlineButton = { text: string; callback_data: string };

export async function tgSend(
  chatId: number,
  text: string,
  options?: { keyboard?: string[][]; inlineKeyboard?: InlineButton[][] },
): Promise<void> {
  let reply_markup: unknown;
  if (options?.inlineKeyboard) {
    reply_markup = { inline_keyboard: options.inlineKeyboard };
  } else if (options?.keyboard) {
    reply_markup = {
      keyboard: options.keyboard.map((row) => row.map((t) => ({ text: t }))),
      resize_keyboard: true,
    };
  }

  await callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup,
  });
}

/** Убирает «часики» на инлайн-кнопке после нажатия (и опц. показывает всплывашку). */
export async function tgAnswerCallback(callbackQueryId: string, text?: string): Promise<void> {
  await callTelegram("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

/** Достаёт последнюю сумму из текста и подпись (всё до суммы). */
export function parsePurchase(text: string): { label: string; amount: number } | null {
  const matches = text.replace(/\s+/g, " ").match(/\d[\d\s.,]*/g);
  if (!matches) return null;
  const raw = matches[matches.length - 1].replace(/[\s.,]/g, "");
  const amount = Number(raw);
  if (!amount || amount <= 0) return null;
  const label = text.slice(0, text.lastIndexOf(matches[matches.length - 1])).trim();
  return { label: label || "покупка", amount };
}
