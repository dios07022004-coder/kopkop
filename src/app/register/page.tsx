import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/login-form";
import { PRODUCT } from "@/data/content";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Регистрация",
  description: `Создайте аккаунт в «${PRODUCT.name}».`,
  path: "/register",
  noindex: true,
});

export default function RegisterPage() {
  return (
    <div className="page-container py-12">
      <div className="mx-auto mb-8 max-w-md text-center">
        <h1 className="text-2xl font-bold">Создать аккаунт</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Регистрация бесплатная — сохраняйте расчёты и историю.
        </p>
      </div>
      <Suspense>
        <AuthForm defaultMode="register" />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
