"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Calculator, FileDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OrderData {
  status: string;
  email: string;
}

export function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("Заказ не найден");
      setLoading(false);
      return;
    }
    async function verifyOrder() {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Ошибка проверки заказа");
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    }
    verifyOrder();
  }, [orderId]);

  if (loading) {
    return <p className="text-center text-muted-foreground">Проверяем оплату...</p>;
  }

  if (error || !order) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Не удалось подтвердить оплату</CardTitle>
          <CardDescription>{error ?? "Обновите страницу или напишите в поддержку."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/checkout">Вернуться к оплате</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (order.status !== "paid") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Оплата ещё обрабатывается</CardTitle>
          <CardDescription>Если вы уже оплатили, подождите минуту и обновите страницу.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.reload()}>Обновить</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-200">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <CardTitle className="text-2xl">Оплата прошла успешно!</CardTitle>
        <CardDescription className="text-base">
          Полный доступ открыт на вашем аккаунте{order.email ? ` (${order.email})` : ""}. Ничего вводить не нужно.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button className="h-12 w-full rounded-xl text-base" size="lg" asChild>
          <Link href="/app">
            <Calculator className="mr-2 h-4 w-4" />
            Открыть калькулятор
          </Link>
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" asChild>
            <Link href="/account">
              <FileDown className="mr-2 h-4 w-4" />
              Файлы
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/account">
              <Send className="mr-2 h-4 w-4" />
              Telegram-бот
            </Link>
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Доступ привязан к аккаунту, с которым вы оплачивали. Заходите тем же способом (Яндекс или почта).
        </p>
      </CardContent>
    </Card>
  );
}
