"use client";

import { useState } from "react";
import { Send, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

/**
 * Подключение Telegram-бота. Основной надёжный способ для РФ: показываем
 * КОД ПРИВЯЗКИ — пользователь открывает бота и присылает этот код сообщением.
 * Дополнительно пытаемся открыть приложение напрямую (tg://). t.me не используем
 * (заблокирован в РФ и «висит»).
 */
export function TelegramLinkButton({
  label = "Подключить Telegram",
  className = "w-full justify-start",
  variant = "outline",
}: {
  label?: string;
  className?: string;
  variant?: "outline" | "default";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch("/api/telegram/link", { method: "POST", signal: ctrl.signal });
      clearTimeout(timer);

      if (res.status === 401) {
        setError("Войдите в аккаунт, чтобы привязать бота");
        setLoading(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.code) {
        setError(data.error ?? "Бот пока не настроен");
        setLoading(false);
        return;
      }
      setCode(data.code);
      setLoading(false);
      // Параллельно пробуем открыть приложение с кодом (если Telegram установлен)
      if (BOT) window.location.href = `tg://resolve?domain=${BOT}&start=${data.code}`;
    } catch {
      setError("Не удалось создать код. Попробуйте ещё раз.");
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <Button className={className} variant={variant} onClick={connect} disabled={loading}>
        <Send className="mr-2 h-4 w-4" />
        {loading ? "Создаём код…" : code ? "Получить новый код" : label}
      </Button>

      {code && (
        <div className="mt-3 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-semibold text-foreground">Привязка за 2 шага:</p>
          <ol className="space-y-1.5 text-muted-foreground">
            <li>
              1. Откройте бота{" "}
              {BOT ? (
                <a href={`tg://resolve?domain=${BOT}`} className="font-medium text-primary underline">
                  @{BOT}
                </a>
              ) : (
                "в Telegram"
              )}{" "}
              (или найдите {BOT ? `@${BOT}` : "его"} в поиске Telegram).
            </li>
            <li>2. Отправьте ему этот код сообщением:</li>
          </ol>
          <div className="flex items-center gap-2">
            <code className="flex-1 select-all rounded-lg border border-border/60 bg-background px-3 py-2 text-center font-mono text-base tracking-wider">
              {code}
            </code>
            <Button variant="outline" size="sm" onClick={copy} aria-label="Скопировать код">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Бот проверит оплату и подтянет ваш бюджет и цель. Код одноразовый.
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-[hsl(var(--danger))]">{error}</p>}
    </div>
  );
}
