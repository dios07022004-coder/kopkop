import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Политика конфиденциальности",
  description: "Как мы обрабатываем персональные данные при покупке калькулятора бюджета «Деньги под контролем».",
  path: "/privacy",
});

const privacyJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Политика конфиденциальности",
      url: absoluteUrl("/privacy"),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Конфиденциальность", item: absoluteUrl("/privacy") },
      ],
    },
  ],
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <JsonLd data={privacyJsonLd} />
      <h1 className="text-3xl font-bold">Политика конфиденциальности</h1>
      <p className="mt-4 text-muted-foreground">Последнее обновление: {new Date().toLocaleDateString("ru-RU")}</p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-xl font-semibold">Какие данные мы собираем</h2>
          <p className="mt-2 text-muted-foreground">
            При оформлении заказа мы получаем имя и email. Платёжные данные обрабатываются
            платёжной системой YooKassa и не хранятся на нашем сервере.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Зачем мы используем данные</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
            <li>Для отправки доступа к цифровому продукту</li>
            <li>Для авторизации в личном кабинете</li>
            <li>Для связи по вопросам заказа</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Хранение и защита</h2>
          <p className="mt-2 text-muted-foreground">
            Данные аккаунта хранятся в Supabase. Мы не передаём email третьим лицам, кроме сервисов доставки писем и оплаты.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Ваши права</h2>
          <p className="mt-2 text-muted-foreground">
            Вы можете запросить удаление аккаунта и данных, написав на email из чека об оплате.
          </p>
        </section>
      </div>
    </div>
  );
}
