"use client";



import { useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import Link from "next/link";

import { CheckCircle2, LogIn, Mail } from "lucide-react";

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



        if (!response.ok) {

          throw new Error(data.error ?? "Ошибка проверки заказа");

        }



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

          <CardDescription>{error ?? "Попробуйте обновить страницу или напишите в поддержку."}</CardDescription>

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

          <CardDescription>

            Если вы уже оплатили заказ, подождите минуту и обновите страницу.

          </CardDescription>

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

          Проверьте почту — мы отправили логин и пароль для входа

        </CardDescription>

      </CardHeader>

      <CardContent className="space-y-4">

        <div className="flex items-start gap-3 rounded-lg bg-muted p-4 text-sm">

          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

          <div>

            <p className="font-medium">Письмо отправлено на {order.email}</p>

            <p className="mt-1 text-muted-foreground">

              В письме — ваш email (логин) и пароль. После входа откроются калькуляторы и файлы таблицы.

            </p>

          </div>

        </div>



        <Button className="h-12 w-full rounded-xl text-base" size="lg" asChild>

          <Link href="/login">

            <LogIn className="mr-2 h-4 w-4" />

            Войти в продукт

          </Link>

        </Button>



        <p className="text-center text-xs text-muted-foreground">

          Не пришло письмо? Проверьте «Спам» или напишите в поддержку с email оплаты.

        </p>

      </CardContent>

    </Card>

  );

}

