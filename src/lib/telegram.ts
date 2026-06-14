/** Минимальный клиент Telegram Bot API. */

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

function api(method: string): string {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
}

export async function tgSend(
  chatId: number,
  text: string,
  options?: { keyboard?: string[][] },
): Promise<void> {
  const reply_markup = options?.keyboard
    ? { keyboard: options.keyboard.map((row) => row.map((t) => ({ text: t }))), resize_keyboard: true }
    : undefined;

  await fetch(api("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup,
    }),
  }).catch(() => {});
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
