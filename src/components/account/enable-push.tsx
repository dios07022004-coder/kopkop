"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "idle" | "on" | "denied" | "unsupported" | "busy";

export function EnablePush() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!VAPID || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "idle"))
      .catch(() => setState("idle"));
  }, []);

  const enable = async () => {
    setError(null);
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID as string) as unknown as BufferSource,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error === "payment required" ? "Доступно после оплаты" : "Не удалось включить");
        setState("idle");
        return;
      }
      setState("on");
    } catch {
      setError("Не удалось включить уведомления");
      setState("idle");
    }
  };

  const disable = async () => {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("idle");
    } catch {
      setState("on");
    }
  };

  if (state === "unsupported") return null;

  return (
    <Card className="soft-card mt-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle>Напоминания в приложении</CardTitle>
        </div>
        <CardDescription>
          Будем присылать на телефон: сколько ещё можно потратить, сколько уже потрачено и когда обновить
          доход после зарплаты.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {state === "on" ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--success))]">
              <Check className="h-4 w-4" /> Уведомления включены
            </span>
            <Button variant="ghost" size="sm" onClick={disable}>
              <BellOff className="mr-2 h-4 w-4" />
              Выключить
            </Button>
          </div>
        ) : state === "denied" ? (
          <p className="text-sm text-muted-foreground">
            Уведомления заблокированы в настройках браузера. Разрешите их для сайта и обновите страницу.
            На iPhone сначала добавьте приложение на экран «Домой».
          </p>
        ) : (
          <Button onClick={enable} disabled={state === "busy"}>
            <Bell className="mr-2 h-4 w-4" />
            {state === "busy" ? "Включаем…" : "Включить напоминания"}
          </Button>
        )}
        {error && <p className="text-xs text-[hsl(var(--danger))]">{error}</p>}
      </CardContent>
    </Card>
  );
}
