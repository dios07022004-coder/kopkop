import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { hasPaidAccess } from "@/lib/access";
import { TelegramLinkButton } from "@/components/account/telegram-link-button";
import { MonthLedger } from "@/components/account/month-ledger";
import { InstallApp } from "@/components/account/install-app";
import { EnablePush } from "@/components/account/enable-push";
import { getMonthSummaryByUser } from "@/lib/telegram-bot";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { DEV_AUTH_COOKIE, getDevAuthConfig, isDevAuthSession } from "@/lib/dev-auth";

export const metadata: Metadata = {
  title: "Кабинет — Деньги под контролем",
};

export default async function AccountPage() {
  const cookieStore = await cookies();
  const devToken = cookieStore.get(DEV_AUTH_COOKIE)?.value;
  const devConfig = getDevAuthConfig();
  const devUser = devConfig && isDevAuthSession(devToken);

  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!user && !devUser) {
    redirect("/login?next=/account");
  }
  if (!devUser && !(await hasPaidAccess())) {
    redirect("/checkout");
  }

  const displayEmail = user?.email ?? devConfig?.email ?? "Пользователь";

  // Живая сводка месяца (бюджет + траты/доходы) — для первой секции
  const tg =
    user && isSupabaseAdminConfigured()
      ? await getMonthSummaryByUser(user.id).catch(() => null)
      : null;

  return (
    <div className="page-container py-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3 animate-float-in">
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl">Кабинет</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">{displayEmail}</p>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" asChild>
            <a href="/auth/signout">Выйти</a>
          </Button>
        </div>

        {/* 1. Расчёты — первая секция */}
        <div className="animate-float-in" style={{ animationDelay: "60ms" }}>
          <MonthLedger initial={tg ?? undefined} />
        </div>

        {/* Изменить бюджет */}
        <div className="mt-3 animate-float-in" style={{ animationDelay: "120ms" }}>
          <Button variant="outline" className="w-full justify-center" asChild>
            <Link href="/app">
              <Calculator className="mr-2 h-4 w-4" />
              Изменить расчёт в калькуляторе
            </Link>
          </Button>
        </div>

        {/* Telegram */}
        <div className="animate-float-in" style={{ animationDelay: "180ms" }} id="telegram">
          <Card className="soft-card mt-4">
            <CardHeader>
              <CardTitle>Telegram-бот</CardTitle>
              <CardDescription>
                {tg?.linked
                  ? "Бот привязан ✓ Записывайте траты прямо в Telegram — суммы появятся здесь."
                  : "Подключите бота — он подтянет бюджет и цель и будет напоминать, сколько можно потратить."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TelegramLinkButton />
            </CardContent>
          </Card>
        </div>

        <div className="animate-float-in" style={{ animationDelay: "240ms" }}>
          <EnablePush />
        </div>

        <div className="animate-float-in" style={{ animationDelay: "300ms" }}>
          <InstallApp />
        </div>
      </div>
    </div>
  );
}
