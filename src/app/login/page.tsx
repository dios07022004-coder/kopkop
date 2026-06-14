import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { PRODUCT } from "@/data/content";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Вход в калькулятор",
  description: "Войдите в личный кабинет «Деньги под контролем» после оплаты.",
  path: "/login",
  noindex: true,
});

export default function LoginPage() {
  return (
    <div className="page-container py-12">
      <div className="mx-auto mb-8 max-w-md text-center">
        <h1 className="text-2xl font-bold">Вход</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Войдите через Яндекс или по email
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Нет аккаунта?{" "}
        <Link href="/register" className="text-primary underline-offset-4 hover:underline">
          Зарегистрироваться
        </Link>
        {" · "}
        <Link href="/checkout" className="text-primary underline-offset-4 hover:underline">
          Купить за {PRODUCT.price} ₽
        </Link>
      </p>
    </div>
  );
}
