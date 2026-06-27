import {
  CtaSection,
  HeroSection,
  PricingSection,
  WorkedExampleSection,
} from "@/components/landing/sections";
import { MobileStickyCta } from "@/components/landing/mobile-sticky-cta";
import { Reveal } from "@/components/landing/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { FAQ_ITEMS, PRODUCT } from "@/data/content";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: `${PRODUCT.name} — калькулятор бюджета`,
  description: `Посчитайте бесплатно, сколько денег у вас свободно в этом месяце. Полный план — куда тратить, где сэкономить и можно ли купить — за ${PRODUCT.price} ₽.`,
  path: "/",
});

const homepageJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: PRODUCT.name,
      url: absoluteUrl("/"),
    },
    {
      "@type": "WebSite",
      name: PRODUCT.name,
      url: absoluteUrl("/"),
      inLanguage: "ru-RU",
    },
    {
      "@type": "Product",
      name: PRODUCT.fullName,
      description: PRODUCT.tagline,
      offers: {
        "@type": "Offer",
        price: PRODUCT.price,
        priceCurrency: "RUB",
        availability: "https://schema.org/InStock",
        url: absoluteUrl("/checkout"),
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={homepageJsonLd} />

      {/* Секция 1 — оффер + живой пример расчёта (в Hero встроен интерактивный демо-калькулятор) */}
      <HeroSection />

      {/* Секция 2 — как считается (детальный пример) + что получаете и цена */}
      <Reveal>
        <WorkedExampleSection />
      </Reveal>
      <Reveal>
        <PricingSection />
      </Reveal>
      <Reveal>
        <CtaSection />
      </Reveal>

      <MobileStickyCta />
      <div className="h-16 sm:hidden" aria-hidden />
    </>
  );
}
