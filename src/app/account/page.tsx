import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getProductLinks } from "@/lib/orders";
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

  const displayEmail = user?.email ?? devConfig?.email ?? "Пользователь";
  const links = getProductLinks();

  return (
    <div className="page-container py-10 sm:py-12">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold">Ваш доступ</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {displayEmail}
        </p>

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
      </div>
    </div>
  );
}
