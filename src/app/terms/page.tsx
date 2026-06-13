import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Публичная оферта",
  description: "Условия покупки цифрового продукта «Деньги под контролем» — калькулятор бюджета и Excel-шаблон.",
  path: "/terms",
});

const termsJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Публичная оферта",
      url: absoluteUrl("/terms"),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Оферта", item: absoluteUrl("/terms") },
      ],
    },
  ],
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 prose prose-slate">
      <JsonLd data={termsJsonLd} />
      <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Оферта" }]} />
      <h1 className="text-3xl font-bold">Публичная оферта</h1>
      <p className="mt-4 text-muted-foreground">Последнее обновление: {new Date().toLocaleDateString("ru-RU")}</p>

      <div className="mt-8 space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold">1. Предмет оферты</h2>
          <p className="mt-2 text-muted-foreground">
            Настоящая оферта регулирует продажу цифрового продукта «Деньги под контролем — калькулятор бюджета»
            (полная версия) в виде доступа к калькулятору, файлов Google Sheets / Excel и HTML-инструкции.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Момент заключения договора</h2>
          <p className="mt-2 text-muted-foreground">
            Договор считается заключённым с момента успешной оплаты заказа через платёжную систему YooKassa.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Стоимость и порядок оплаты</h2>
          <p className="mt-2 text-muted-foreground">
            Стоимость продукта указана на сайте на момент оплаты. Оплата производится единоразово через YooKassa.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Предоставление доступа</h2>
          <p className="mt-2 text-muted-foreground">
            После оплаты покупатель получает доступ к калькуляторам на сайте и ссылки на скачивание файлов на указанный email.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Возврат</h2>
          <p className="mt-2 text-muted-foreground">
            Цифровой продукт с мгновенным доступом. Возврат возможен в течение 14 дней, если продукт не использовался.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Ограничение ответственности</h2>
          <p className="mt-2 text-muted-foreground">
            Продукт не является финансовой консультацией. Решения принимаются покупателем самостоятельно на основе своих данных.
          </p>
        </section>
      </div>
    </div>
  );
}
