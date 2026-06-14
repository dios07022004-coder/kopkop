"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCT } from "@/data/content";
import { readUtmCookie } from "@/lib/utm";

export function CheckoutForm({ authed }: { authed: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(!authed);
  const [loading, setLoading] = useState(false);

  const pay = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utm: readUtmCookie() }),
      });
      const result = await response.json();
      if (response.status === 401) {
        setNeedLogin(true);
        setLoading(false);
        return;
      }
      if (!response.ok) throw new Error(result.error ?? "Ошибка создания платежа");
      if (result.confirmationUrl) {
        window.location.href = result.confirmationUrl;
      } else {
        throw new Error("Не получена ссылка на оплату");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Оплата полной версии</CardTitle>
        <CardDescription>
          {PRODUCT.fullName} — {PRODUCT.price} ₽, разовая оплата
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {needLogin ? (
          <>
            <p className="text-sm text-muted-foreground">
              Чтобы оплатить, войдите в аккаунт — доступ привяжется к нему автоматически,
              без ввода почты.
            </p>
            <Button className="w-full" size="lg" asChild>
              <Link href="/login?next=/checkout">Войти / Создать аккаунт</Link>
            </Button>
          </>
        ) : (
          <>
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            <Button className="w-full" size="lg" disabled={loading} onClick={pay}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 animate-spin" />
                  Переход к оплате…
                </>
              ) : (
                `Оплатить ${PRODUCT.price} ₽ через YooKassa`
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Нажимая «Оплатить», вы принимаете{" "}
              <Link href="/terms" className="underline">оферту</Link> и{" "}
              <Link href="/privacy" className="underline">политику конфиденциальности</Link>.
              Доступ откроется сразу после оплаты.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
