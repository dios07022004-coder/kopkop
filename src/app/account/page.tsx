import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getProductLinks } from "@/lib/orders";
import { hasPaidAccess } from "@/lib/access";
import { TelegramLinkButton } from "@/components/account/telegram-link-button";
import { getAccountTgSummary } from "@/lib/telegram-bot";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { DEV_AUTH_COOKIE, getDevAuthConfig, isDevAuthSession } from "@/lib/dev-auth";

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

export const metadata: Metadata = {
  title: "Мой доступ — Деньги под контролем",
};

export default async function AccountPage() {
  const cookieStore = await cookies();
  const devToken = cookieStore.get(DEV_AUTH_COOKIE)?.value;
  const devConfig = getDevAuthConfig();
  const devUser = devConfig && isDevAuthSession(devToken);

  const supabase = await createClient();
  const user = supabase
    ? (await supabase.auth.getUser()).data.user
    : null;

  if (!user && !devUser) {
    redirect("/login?next=/account");
  }

  // Файлы продукта — только для оплативших (или админа / dev).
  if (!devUser && !(await hasPaidAccess())) {
    redirect("/checkout");
  }

  const displayEmail = user?.email ?? devConfig?.email ?? "Пользователь";
  const links = getProductLinks();

  // Сводка из Telegram-бота (что записано в этом месяце) — связь сайт ↔ бот
  const tg =
    user && isSupabaseAdminConfigured()
      ? await getAccountTgSummary(user.id).catch(() => null)
      : null;

  return (
    <div className="page-container py-10 sm:py-12">
      <div className="mx-auto max-w-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Ваш доступ</h1>
            <p className="mt-2 text-sm text-muted-foreground">{displayEmail}</p>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" asChild>
            <a href="/auth/signout">Выйти</a>
          </Button>
        </div>

        <Card className="soft-card mt-8">
          <CardHeader>
            <CardTitle>Калькуляторы</CardTitle>
            <CardDescription>Бюджет, накопления и покупки</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href="/app">Открыть калькулятор</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="soft-card mt-4">
          <CardHeader>
            <CardTitle>Файлы</CardTitle>
            <CardDescription>Таблица и инструкция</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline" asChild>
              <a href={links.googleSheets} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Google Sheets
              </a>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <a href={links.excel}>
                <Download className="mr-2 h-4 w-4" />
                Скачать Excel
              </a>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <a href={links.instruction}>
                <Download className="mr-2 h-4 w-4" />
                HTML-инструкция
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="soft-card mt-4">
          <CardHeader>
            <CardTitle>Telegram-бот</CardTitle>
            <CardDescription>
              Записывайте траты в Telegram — бот ведёт месяц, а здесь видна та же картина
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tg?.linked && tg.income > 0 ? (
              <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                <p className="text-xs font-medium text-muted-foreground">В этом месяце через бота</p>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Потрачено</p>
                    <p className="text-base font-semibold">{fmt(tg.spentMonth)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Осталось</p>
                    <p className="text-base font-semibold">
                      {fmt(Math.max(0, tg.remaining))}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ≈ {fmt(tg.perDay)}/день
                      </span>
                    </p>
                  </div>
                </div>
                {tg.goalName && tg.goalRemaining > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    🎯 До цели «{tg.goalName}»: осталось {fmt(tg.goalRemaining)}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Бот привязан ✓ Записывайте траты в Telegram — суммы появятся здесь.
                </p>
              </div>
            ) : tg?.linked ? (
              <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                Бот привязан ✓ Сохраните расчёт в калькуляторе — бот подтянет бюджет и цель, и начнёт вести
                ваши траты.
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Подключите бота — он подтянет ваш бюджет и цель, будет принимать ежедневные траты и напоминать,
                сколько можно потратить.
              </p>
            )}
            <TelegramLinkButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
