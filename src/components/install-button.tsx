"use client";

import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Кнопка установки PWA для страницы /install. Если браузер поддерживает
 * системный диалог (Android/Chrome, desktop) — ставит в один тап. Иначе
 * (iOS и пр.) — кнопка не показывается, пользователь идёт по инструкции ниже.
 */
export function InstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed) {
    return (
      <p className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--success))]/10 px-4 py-2 text-sm font-medium text-[hsl(var(--success))]">
        <Check className="h-4 w-4" /> Приложение уже установлено
      </p>
    );
  }

  if (!deferred) return null; // iOS/неподдерживаемые — ниже инструкция

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <Button size="lg" className="h-12 rounded-xl px-8 text-base" onClick={install}>
      <Download className="mr-2 h-5 w-5" />
      Установить приложение
    </Button>
  );
}
