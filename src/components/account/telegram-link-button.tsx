"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

/**
 * Кнопка «в Telegram». Открывает приложение Telegram напрямую через схему
 * tg://resolve (t.me в РФ заблокирован и «висит»). Для залогиненных создаёт
 * привязочный код (бот подтянет бюджет к аккаунту); иначе просто открывает бота.
 * Никогда не «висит»: есть таймаут и видимый ручной фолбэк.
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
  const [opened, setOpened] = useState(false);

  const openApp = (code?: string) => {
    if (!BOT) return false;
    const tg = code ? `tg://resolve?domain=${BOT}&start=${code}` : `tg://resolve?domain=${BOT}`;
    window.location.href = tg;
    setOpened(true);
    return true;
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
        if (openApp()) {
          setLoading(false);
          return;
        }
        setError("Войдите в аккаунт, чтобы привязать бота");
        setLoading(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.appUrl) {
        if (openApp()) {
          setLoading(false);
          return;
        }
        setError(data.error ?? "Бот пока не настроен");
        setLoading(false);
        return;
      }
      openApp(data.code); // привязочный код → бот подтянет бюджет
      setLoading(false);
    } catch {
      // таймаут/сеть — пробуем открыть бота напрямую
      if (openApp()) {
        setLoading(false);
        return;
      }
      setError("Не удалось создать ссылку. Попробуйте ещё раз.");
      setLoading(false);
    }
  };

  return (
    <div>
      <Button className={className} variant={variant} onClick={connect} disabled={loading}>
        <Send className="mr-2 h-4 w-4" />
        {loading ? "Открываем Telegram…" : opened ? "Открыть Telegram ещё раз" : label}
      </Button>

      {opened && (
        <div className="mt-3 space-y-1 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Telegram не открылся?</p>
          <p>
            Откройте приложение Telegram, найдите бота{" "}
            {BOT && (
              <a href={`tg://resolve?domain=${BOT}`} className="font-medium text-primary underline">
                @{BOT}
              </a>
            )}{" "}
            и нажмите <span className="font-medium">Запустить / Start</span>.
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-[hsl(var(--danger))]">{error}</p>}
    </div>
  );
}
