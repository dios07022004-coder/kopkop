import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import Link from "next/link";
import { FAQ_ITEMS, PRODUCT } from "@/data/content";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "FAQ — вопросы о калькуляторе бюджета",
  description:
    "Ответы о продукте «Деньги под контролем»: оплата, Excel и Google Sheets, калькулятор на сайте, возврат и использование с телефона.",
  path: "/faq",
});

const faqJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "FAQ", item: absoluteUrl("/faq") },
      ],
    },
  ],
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <JsonLd data={faqJsonLd} />
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "FAQ" }]} />
      <h1 className="text-3xl font-bold">Частые вопросы</h1>
      <p className="mt-3 text-muted-foreground">
        Ответы о продукте, использовании таблицы и оплате
      </p>

      <Accordion type="single" collapsible className="mt-10">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem key={item.question} value={`item-${i}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-12 rounded-xl border bg-muted/30 p-8 text-center">
        <p className="font-medium">Готовы начать?</p>
        <p className="mt-2 text-sm text-muted-foreground">
          После оплаты на email придут логин и пароль для доступа к калькуляторам и файлам.
        </p>
        <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="outline" asChild>
            <Link href="/login">Войти</Link>
          </Button>
          <Button asChild>
            <Link href="/checkout">Купить за {PRODUCT.price} ₽</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
