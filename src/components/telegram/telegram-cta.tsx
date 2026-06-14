"use client";

import { Bell, Calculator, Target, Wallet } from "lucide-react";
import { TelegramLinkButton } from "@/components/account/telegram-link-button";

/**
 * Воронка в Telegram после расчёта: показываем ценность ежедневного бота и
 * уводим пользователя продолжать в Telegram. Работает и для гостей (откроет
 * бота напрямую), и для залогиненных (привяжет бюджет к аккаунту).
 */
export function TelegramCta({
  title = "Дальше — в Telegram",
  subtitle = "Расчёт готов. Перенесите его в Telegram — и я каждый день буду напоминать, сколько можно потратить, сколько осталось накопить и когда обновить бюджет.",
  label = "Продолжить в Telegram",
}: {
  title?: string;
  subtitle?: string;
  label?: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Bell className="h-5 w-5" />
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

      <div className="mt-4">
        <TelegramLinkButton label={label} variant="default" className="w-full justify-center sm:w-auto sm:px-8" />
        <p className="mt-2 text-xs text-muted-foreground">
          Бесплатно. Бюджет и цель подтянутся автоматически и будут меняться вместе с сайтом.
        </p>
      </div>
    </section>
  );
}
