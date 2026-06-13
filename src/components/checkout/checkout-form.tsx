"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PRODUCT } from "@/data/content";
import { checkoutSchema, type CheckoutSchema } from "@/lib/validations";
import { readUtmCookie } from "@/lib/utm";

export function CheckoutForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutSchema>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      agreeToTerms: false as unknown as true,
    },
  });

  const agreeToTerms = watch("agreeToTerms");

  const onSubmit = async (data: CheckoutSchema) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, utm: readUtmCookie() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Ошибка создания платежа");
      }

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
        <CardTitle>Оформление заказа</CardTitle>
        <CardDescription>
          {PRODUCT.fullName} — {PRODUCT.price} ₽
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input id="name" placeholder="Как к вам обращаться" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              На этот email отправим ссылки на файлы
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="agreeToTerms"
              checked={agreeToTerms === true}
              onCheckedChange={(checked) =>
                setValue("agreeToTerms", (checked === true) as true, {
                  shouldValidate: true,
                })
              }
            />
            <Label htmlFor="agreeToTerms" className="text-sm leading-relaxed">
              Я согласен с{" "}
              <Link href="/terms" className="text-primary underline">
                офертой
              </Link>{" "}
              и{" "}
              <Link href="/privacy" className="text-primary underline">
                политикой конфиденциальности
              </Link>
            </Label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-600">{errors.agreeToTerms.message}</p>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Переход к оплате...
              </>
            ) : (
              `Оплатить ${PRODUCT.price} ₽ через YooKassa`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
