import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Страница не найдена",
  description: "Запрошенная страница не существует.",
  path: "/404",
  noindex: true,
});

export default function NotFound() {
  return (
    <div className="page-container flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-2 text-3xl font-bold">Страница не найдена</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Возможно, ссылка устарела. Вернитесь на главную или оформите доступ к калькулятору.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" asChild>
          <Link href="/">На главную</Link>
        </Button>
        <Button asChild>
          <Link href="/checkout">Получить доступ</Link>
        </Button>
      </div>
    </div>
  );
}
