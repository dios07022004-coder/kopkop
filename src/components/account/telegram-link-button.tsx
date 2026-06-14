"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TelegramLinkButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Бот пока не настроен");
        setLoading(false);
        return;
      }
      window.location.href = data.url; // откроет Telegram с кодом привязки
    } catch {
      setError("Не удалось создать ссылку");
      setLoading(false);
    }
  };

  return (
    <div>
      <Button className="w-full justify-start" variant="outline" onClick={connect} disabled={loading}>
        <Send className="mr-2 h-4 w-4" />
        {loading ? "Создаём ссылку…" : "Подключить Telegram-бота"}
      </Button>
      {error && <p className="mt-2 text-xs text-[hsl(var(--danger))]">{error}</p>}
    </div>
  );
}
