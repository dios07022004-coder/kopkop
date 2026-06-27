"use client";

import Link from "next/link";
import { Bell, Calculator, Smartphone, Target, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TelegramLinkButton } from "@/components/account/telegram-link-button";

/**
 * Воронка после расчёта: уводим продолжать в ПРИЛОЖЕНИИ (основной фокус) или в Telegram.
 * Оба канала ведут один и тот же бюджет (общий леджер).
 */
export function TelegramCta({
  title = "Дальше — в приложении или Telegram",
  subtitle = "Записывайте траты в приложении на телефоне или в Telegram — я каждый день буду напоминать, сколько ещё можно потратить и сколько осталось накопить. Цифры везде одинаковые.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="cabinet-glow overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { icon: Wallet, text: "Записывай траты — веду месяц" },
          { icon: Target, text: "Слежу за целью накоплений" },
          { icon: Calculator, text: "«Можно купить?» в один клик" },
        ].map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-xs"
          >
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {/* Основной фокус — приложение */}
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone className="h-4 w-4 text-primary" /> Приложение на телефон
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Установите — ярлык на экране, push-уведомления, работает офлайн.
          </p>
          <Button asChild className="mt-3 w-full rounded-xl">
            <Link href="/install">Установить приложение</Link>
          </Button>
        </div>

        {/* Альтернатива — Telegram */}
        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4 text-primary" /> Или в Telegram
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Бот подтянет бюджет и будет напоминать.</p>
          <div className="mt-3">
            <TelegramLinkButton label="Продолжить в Telegram" className="w-full justify-center" variant="outline" />
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Бесплатно для подписчиков. Бюджет и цель синхронизируются между сайтом, приложением и Telegram.
      </p>
    </section>
  );
}
