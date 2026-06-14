"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

/**
 * Кнопка «в Telegram». Для залогиненных создаёт привязочную ссылку
 * (t.me/<bot>?start=<code> — бот подтянет бюджет к аккаунту). Если не залогинен
 * или что-то пошло не так — открывает бота напрямую (t.me/<bot>), чтобы поток
 * в Telegram не прерывался. Никогда не «висит»: есть таймаут.
 */
export function TelegramLinkButton({
  label = "Подключить Telegram-бота",
  className = "w-full justify-start",
  variant = "outline",
}: {
  label?: string;
  className?: string;
  variant?: "outline" | "default";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openBot = () => {
    if (BOT) {
      window.location.href = `https://t.me/${BOT}`;
      return true;
    }
    return false;
  };

  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch("/api/telegram/link", { method: "POST", signal: ctrl.signal });
      clearTimeout(timer);

      if (res.status === 401) {
        // не залогинен — всё равно ведём в бота (привяжет аккаунт позже)
        if (openBot()) return;
        setError("Войдите в аккаунт, чтобы привязать бота");
        setLoading(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        if (openBot()) return;
        setError(data.error ?? "Бот пока не настроен");
        setLoading(false);
        return;
      }
      window.location.href = data.url; // привязочная ссылка
    } catch {
      // таймаут/сеть — пробуем открыть бота напрямую
      if (openBot()) return;
      setError("Не удалось создать ссылку. Попробуйте ещё раз.");
      setLoading(false);
    }
  };

  return (
    <div>
      <Button className={className} variant={variant} onClick={connect} disabled={loading}>
        <Send className="mr-2 h-4 w-4" />
        {loading ? "Открываем Telegram…" : label}
      </Button>
      {error && <p className="mt-2 text-xs text-[hsl(var(--danger))]">{error}</p>}
    </div>
  );
}
