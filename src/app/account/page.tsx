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
import { MonthLedger } from "@/components/account/month-ledger";
import { getMonthSummaryByUser } from "@/lib/telegram-bot";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { DEV_AUTH_COOKIE, getDevAuthConfig, isDevAuthSession } from "@/lib/dev-auth";

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

  // Живая сводка месяца (бюджет + траты/доходы леджера) — связь сайт ↔ бот
  const tg =
    user && isSupabaseAdminConfigured()
      ? await getMonthSummaryByUser(user.id).catch(() => null)
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

        <MonthLedger initial={tg ?? undefined} />

        <Card className="soft-card mt-4">
          <CardHeader>
            <CardTitle>Telegram-бот</CardTitle>
            <CardDescription>
              {tg?.linked
                ? "Бот привязан ✓ Записывайте траты прямо в Telegram — суммы появятся здесь."
                : "Подключите бота — он подтянет бюджет и цель, примет ежедневные траты и будет напоминать, сколько можно потратить."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TelegramLinkButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
