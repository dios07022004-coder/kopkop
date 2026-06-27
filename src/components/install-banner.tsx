"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "install-banner-dismissed-v1";

/**
 * Глобальный ненавязчивый баннер «Установить приложение» внизу экрана.
 * Android/Chrome — установка в один тап. iOS — ведём на /account с инструкцией.
 * Скрыт, если уже установлено или пользователь закрыл баннер.
 */
export function InstallBanner() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIos(ios);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // На iOS события нет — показываем баннер-инструкцию сами
    if (ios) setShow(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      dismiss();
    } else {
      window.location.href = "/install";
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-16 z-50 border-y border-border/60 bg-background/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:bottom-0 md:border-b-0">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <Download className="h-5 w-5 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-medium">Установите приложение</span>
          <span className="ml-1 hidden text-muted-foreground sm:inline">
            — траты, доходы и остаток всегда под рукой, работает офлайн.
          </span>
        </p>
        <button
          type="button"
          onClick={install}
          className="shrink-0 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {isIos && !deferred ? "Как установить" : "Установить"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Закрыть"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
