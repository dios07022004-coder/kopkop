import type { Metadata } from "next";
import Link from "next/link";
import { Smartphone, Share, MoreVertical, Plus, Check, Bell, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InstallButton } from "@/components/install-button";

export const metadata: Metadata = {
  title: "Установить приложение — Деньги под контролем",
  description: "Как установить приложение на iPhone и Android: ярлык на экране, работа офлайн, напоминания.",
};

export default function InstallPage() {
  return (
    <div className="page-container py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Smartphone className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">Приложение на телефон</h1>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Установите как обычное приложение: иконка на экране, открывается на весь экран, работает офлайн.
            Весь функционал внутри — траты, доходы, остаток до зарплаты, цель.
          </p>
        </div>

        {/* Быстрая установка (Android/desktop через системный диалог) */}
        <div className="mt-6 text-center">
          <InstallButton />
        </div>

        <div className="mt-8 grid gap-4">
          {/* iPhone */}
          <Card className="soft-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">📱 iPhone (Safari)</CardTitle>
              <CardDescription>Установка занимает 15 секунд</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">1</span>
                  <span className="leading-relaxed">
                    Откройте сайт в <b>Safari</b> и нажмите кнопку «Поделиться»{" "}
                    <Share className="inline h-4 w-4 align-text-bottom" /> внизу экрана.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">2</span>
                  <span className="leading-relaxed">
                    Пролистайте вниз и выберите <b>«На экран „Домой“»</b>{" "}
                    <Plus className="inline h-4 w-4 align-text-bottom" />.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">3</span>
                  <span className="leading-relaxed">
                    Нажмите <b>«Добавить»</b> — иконка появится на главном экране{" "}
                    <Check className="inline h-4 w-4 align-text-bottom text-[hsl(var(--success))]" />.
                  </span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Android */}
          <Card className="soft-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">🤖 Android (Chrome)</CardTitle>
              <CardDescription>Или нажмите кнопку «Установить» выше</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">1</span>
                  <span className="leading-relaxed">
                    Откройте меню браузера <MoreVertical className="inline h-4 w-4 align-text-bottom" /> (три точки
                    справа сверху).
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">2</span>
                  <span className="leading-relaxed">
                    Выберите <b>«Установить приложение»</b> или «Добавить на главный экран».
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">3</span>
                  <span className="leading-relaxed">Готово — откроется как обычное приложение.</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Что внутри */}
        <div className="mt-8 rounded-2xl border border-border/60 bg-muted/30 p-5">
          <p className="font-semibold">Что внутри приложения</p>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Траты и доходы в один тап</li>
            <li className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> Остаток до зарплаты и «в день»</li>
            <li className="flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Напоминания (скоро — push)</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Те же цифры, что в Telegram</li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/account">Вернуться в кабинет</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
