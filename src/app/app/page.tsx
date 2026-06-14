import Link from "next/link";
import { CalculatorApp } from "@/components/calculator/calculator-app";
import { Button } from "@/components/ui/button";
import { CALCULATOR_PAGE } from "@/data/calculator-copy";
import { hasPaidAccess } from "@/lib/access";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Калькулятор бюджета",
  description: "Введите свои цифры — узнайте, сколько денег у вас свободно.",
  path: "/app",
});

export default async function AppPage() {
  const paid = await hasPaidAccess();

  return (
    <div className="page-container py-8 sm:py-12">
      <div className="mx-auto mb-8 flex max-w-3xl items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{CALCULATOR_PAGE.title}</h1>
          <p className="mt-2 text-muted-foreground">{CALCULATOR_PAGE.subtitle}</p>
        </div>
        {paid && (
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/account">Файлы</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="/auth/signout">Выйти</a>
            </Button>
          </div>
        )}
      </div>
      <CalculatorApp paid={paid} />
    </div>
  );
}
