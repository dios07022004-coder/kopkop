import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { FREEMIUM, PRODUCT } from "@/data/content";
import { createClient } from "@/lib/supabase/server";
import { hasPaidAccess } from "@/lib/access";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Оформление заказа — калькулятор бюджета",
  description: `Полная версия калькулятора бюджета, Excel-шаблон и инструкция за ${PRODUCT.price} ₽. Разовая оплата, доступ сразу после оплаты.`,
  path: "/checkout",
});

const checkoutJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      name: PRODUCT.fullName,
      offers: {
        "@type": "Offer",
        price: PRODUCT.price,
        priceCurrency: "RUB",
        url: absoluteUrl("/checkout"),
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Оформление заказа", item: absoluteUrl("/checkout") },
      ],
    },
  ],
};

export default async function CheckoutPage() {
  // Уже оплачено → в кабинет.
  if (await hasPaidAccess()) redirect("/account");
  const supabase = await createClient();
  const authed = Boolean(supabase && (await supabase.auth.getUser()).data.user);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <JsonLd data={checkoutJsonLd} />
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: "Оформление заказа" },
        ]}
      />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <h1 className="text-3xl font-bold">Полная версия</h1>
          <p className="mt-3 text-muted-foreground">
            Разовая оплата — доступ привяжется к вашему аккаунту автоматически.
          </p>

          <Card className="mt-8">
            <CardContent className="pt-6">
              <h2 className="font-semibold">Что вы получите:</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {FREEMIUM.paid.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-baseline gap-2">
                <p className="text-2xl font-bold">{PRODUCT.price} ₽</p>
                <p className="text-sm text-muted-foreground line-through">
                  {PRODUCT.anchorPrice} ₽
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Оплата защищена YooKassa — карты, СБП, кошельки. Данные карты мы не видим.
            </p>
            <p className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Доступ открывается сразу после оплаты — в том же аккаунте, без ввода почты.
            </p>
          </div>
        </div>

        <CheckoutForm authed={authed} />
      </div>
    </div>
  );
}
