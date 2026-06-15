"use client";

import { useEffect, useState } from "react";
import { Smartphone, Share, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Установка приложения на телефон (PWA). Android/Chrome — установка в один тап
 * через beforeinstallprompt. iOS Safari — инструкция «Поделиться → На экран Домой».
 * Если уже установлено (standalone) — карточку не показываем.
 */
export function InstallApp() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // уже открыто как приложение?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <Card className="soft-card mt-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <CardTitle>Приложение на телефон</CardTitle>
        </div>
        <CardDescription>
          Установите как приложение — ярлык на экране, открывается на весь экран, работает офлайн. Весь
          функционал внутри: траты, доходы, остаток месяца, цель.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {deferred ? (
          <Button onClick={install} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Установить приложение
          </Button>
        ) : isIos ? (
          <div className="space-y-1.5 text-muted-foreground">
            <p className="font-medium text-foreground">На iPhone (Safari):</p>
            <p className="flex items-center gap-1.5">
              1. Нажмите <Share className="inline h-4 w-4" /> «Поделиться» внизу экрана.
            </p>
            <p>2. Выберите «На экран „Домой“».</p>
            <p>3. Готово — иконка появится на главном экране.</p>
          </div>
        ) : (
          <div className="space-y-1.5 text-muted-foreground">
            <p className="font-medium text-foreground">На Android (Chrome):</p>
            <p>1. Меню браузера ⋮ (три точки справа сверху).</p>
            <p>2. «Установить приложение» / «Добавить на главный экран».</p>
            <p>3. Готово — откроется как обычное приложение.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
