import Link from "next/link";
import { ArrowRight, CheckCircle2, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/layout/section";
import {
  BEFORE_AFTER,
  CALCULATOR_EXAMPLES,
  FAQ_ITEMS,
  FINAL_CTA,
  FOR_WHOM_SCENARIOS,
  FREEMIUM,
  GUARANTEE,
  HERO,
  HOW_PAID_WORKS,
  PRODUCT,
  SIMPLE_EXPLANATION,
  THREE_TOOLS,
  WORKED_EXAMPLE,
} from "@/data/content";
import { HomeDemo } from "@/components/landing/home-demo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const withPrice = (text: string) => text.replace("{price}", String(PRODUCT.price));

const EXAMPLE_SURFACE = {
  success: "surface-success",
  warning: "surface-warning",
  danger: "surface-danger",
} as const;

export function HeroSection() {
  return (
    <section className="brand-gradient relative overflow-hidden pb-14 pt-10 sm:pb-20 sm:pt-16">
      <div className="page-container">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-5 rounded-full px-4 py-1">
            {HERO.badge}
          </Badge>
          <h1 className="text-balance text-[1.9rem] font-bold leading-tight tracking-tight sm:text-5xl">
            {HERO.title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-xl">
            {HERO.subtitle}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="h-12 w-full max-w-sm rounded-xl text-base sm:w-auto sm:px-10"
              asChild
            >
              <Link href="/app">
                {HERO.ctaCalculator}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full max-w-sm rounded-xl text-base sm:w-auto sm:px-8"
              asChild
            >
              <Link href="/checkout">{withPrice(HERO.ctaBuy)}</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground sm:text-sm">
            {withPrice(HERO.note)}
          </p>
        </div>

        {/* Живое мини-демо — считаем прямо здесь */}
        <div className="mx-auto mt-10 max-w-3xl">
          <HomeDemo />
        </div>
      </div>
    </section>
  );
}

export function FreemiumSection() {
  return (
    <Section
      id="free-paid"
      title="Попробуйте бесплатно, откройте полное — за 399 ₽"
      subtitle="Базовый расчёт — без оплаты и регистрации. Готовый план действий — в полной версии."
    >
      <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 sm:gap-6">
        <div className="soft-card p-6">
          <p className="text-sm font-semibold text-muted-foreground">{FREEMIUM.free.title}</p>
          <ul className="mt-4 space-y-3">
            {FREEMIUM.free.items.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="mt-6 w-full rounded-xl" asChild>
            <Link href="/app">Посчитать бесплатно</Link>
          </Button>
        </div>
        <div className="soft-card border-primary/30 bg-primary/5 p-6">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Lock className="h-3.5 w-3.5" />
            {withPrice(FREEMIUM.paid.title)}
          </p>
          <ul className="mt-4 space-y-3">
            {FREEMIUM.paid.items.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
          <Button className="mt-6 w-full rounded-xl" asChild>
            <Link href="/checkout">{withPrice(FREEMIUM.lock.cta)}</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}

export function HowItWorksSection() {
  return (
    <Section id="how" title={SIMPLE_EXPLANATION.title} className="bg-secondary/30">
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
        {SIMPLE_EXPLANATION.steps.map((step, i) => (
          <div key={step.title} className="soft-card p-5 sm:p-6">
            <span className="text-3xl">{step.emoji}</span>
            <p className="mt-3 text-xs font-medium text-muted-foreground">Шаг {i + 1}</p>
            <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function BeforeAfterSection() {
  return (
    <Section title={BEFORE_AFTER.title} className="bg-secondary/30">
      <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 sm:gap-6">
        <div className="soft-card p-5 sm:p-6">
          <p className="text-sm font-medium text-muted-foreground">Было</p>
          <ul className="mt-4 space-y-3">
            {BEFORE_AFTER.before.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--danger))]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="soft-card border-primary/30 p-5 sm:p-6">
          <p className="text-sm font-medium text-primary">Стало</p>
          <ul className="mt-4 space-y-3">
            {BEFORE_AFTER.after.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

export function WorkedExampleSection() {
  const ex = WORKED_EXAMPLE;
  return (
    <Section title={ex.title} subtitle={ex.subtitle} className="bg-secondary/30">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Что вводит */}
        <div className="soft-card p-5 sm:p-6">
          <p className="text-sm font-semibold text-muted-foreground">Аня вводит 4 цифры</p>
          <ul className="mt-3 space-y-2">
            {ex.inputs.map((i) => (
              <li key={i.label} className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{i.label}</span>
                <span className="shrink-0 font-semibold">{i.value}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Главный ответ */}
        <div className="soft-card border-primary/30 p-5 text-center sm:p-6">
          <p className="text-sm text-muted-foreground">Свободно на жизнь</p>
          <p className="mt-1 text-4xl font-bold text-primary">{ex.free.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {ex.free.formula} · {ex.free.perDay}
          </p>
          <p className="mx-auto mt-3 max-w-md rounded-lg surface-warning border px-3 py-2 text-xs">
            {ex.free.account}
          </p>
        </div>

        {/* Куда тратить */}
        <div className="soft-card p-5 sm:p-6">
          <p className="font-semibold">{ex.distribute.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{ex.distribute.note}</p>
          <ul className="mt-4 space-y-3">
            {ex.distribute.rows.map((r) => (
              <li key={r.label}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span>{r.label} · {r.percent}%</span>
                  <span className="font-semibold text-primary">{r.amount}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${r.percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Накопить + Купить */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="soft-card p-5 sm:p-6">
            <p className="font-semibold">{ex.save.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{ex.save.goal}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-secondary/40 p-3">
                <p className="text-xs text-muted-foreground">Откладывать</p>
                <p className="font-bold text-primary">{ex.save.perMonth}</p>
              </div>
              <div className="rounded-lg bg-secondary/40 p-3">
                <p className="text-xs text-muted-foreground">Останется на жизнь</p>
                <p className="font-bold">{ex.save.lifeLeft}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{ex.save.insight}</p>
          </div>
          <div className="soft-card p-5 sm:p-6">
            <p className="font-semibold">{ex.buy.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{ex.buy.item}</p>
            <p className="mt-3 inline-block rounded-lg surface-success border px-3 py-1.5 text-sm font-semibold">
              {ex.buy.verdict}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{ex.buy.detail}</p>
          </div>
        </div>

        <p className="rounded-2xl border surface-success p-5 text-center text-sm font-medium">
          {ex.outcome}
        </p>
      </div>
    </Section>
  );
}

export function HowPaidWorksSection() {
  return (
    <Section title={HOW_PAID_WORKS.title} subtitle={HOW_PAID_WORKS.subtitle}>
      <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 sm:gap-6">
        <div className="soft-card p-6">
          <p className="text-sm font-semibold text-muted-foreground">{HOW_PAID_WORKS.free.title}</p>
          <ul className="mt-4 space-y-3">
            {HOW_PAID_WORKS.free.items.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="soft-card border-primary/30 bg-primary/5 p-6">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Lock className="h-3.5 w-3.5" />
            {HOW_PAID_WORKS.paid.title}
          </p>
          <ul className="mt-4 space-y-3">
            {HOW_PAID_WORKS.paid.items.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
          <Button className="mt-6 w-full rounded-xl" asChild>
            <Link href="/checkout">{withPrice(FREEMIUM.lock.cta)}</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}

export function ThreeToolsSection() {
  return (
    <Section id="tools" title={THREE_TOOLS.title} subtitle={THREE_TOOLS.subtitle}>
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
        {THREE_TOOLS.tools.map((tool) => (
          <div key={tool.name} className="soft-card p-5 sm:p-6">
            <h3 className="text-lg font-semibold">{tool.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {tool.description}
            </p>
            <p className="mt-4 rounded-lg bg-secondary/60 px-3 py-2 text-xs font-medium text-muted-foreground">
              {tool.preview}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function ExamplesSection() {
  return (
    <Section title="Примеры ответов" className="bg-secondary/30">
      <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2 sm:gap-4">
        {CALCULATOR_EXAMPLES.map((example) => (
          <div
            key={example.scenario}
            className={cn("rounded-2xl border p-4 sm:p-5", EXAMPLE_SURFACE[example.color])}
          >
            <p className="text-sm text-muted-foreground">{example.scenario}</p>
            <p className="mt-1 text-lg font-semibold">{example.result}</p>
            <p className="mt-1 text-sm text-muted-foreground">{example.explanation}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function PricingSection() {
  return (
    <Section
      id="pricing"
      title="Один раз — и ваше навсегда"
      subtitle="Полный доступ к калькулятору, шаблону и инструкции"
    >
      <div className="mx-auto max-w-sm">
        <Card className="soft-card overflow-hidden border-primary/30">
          <CardHeader className="bg-accent/50 text-center">
            <CardDescription>
              <span className="line-through">консультация {PRODUCT.anchorPrice}+ ₽</span>
            </CardDescription>
            <CardTitle className="text-4xl font-bold sm:text-5xl">
              {PRODUCT.price}{" "}
              <span className="text-xl font-normal text-muted-foreground">₽</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <ul className="space-y-2.5 text-sm">
              {FREEMIUM.paid.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button className="h-12 w-full rounded-xl text-base" size="lg" asChild>
              <Link href="/checkout">{withPrice(FREEMIUM.lock.cta)}</Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Оплата через YooKassa · доступ сразу после оплаты · без подписки
            </p>
          </CardContent>
        </Card>

        <ul className="mx-auto mt-6 max-w-sm space-y-2.5">
          {GUARANTEE.items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

export function ForWhomScenariosSection() {
  return (
    <Section title={FOR_WHOM_SCENARIOS.title} subtitle={FOR_WHOM_SCENARIOS.subtitle}>
      <div className="grid gap-4 sm:grid-cols-3">
        {FOR_WHOM_SCENARIOS.items.map((item) => (
          <article key={item.title} className="soft-card p-5 text-center sm:p-6">
            <div className="text-3xl">{item.emoji}</div>
            <h3 className="mt-3 font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.example}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

export function FaqPreviewSection() {
  return (
    <Section title="Вопросы" className="bg-secondary/30">
      <div className="mx-auto max-w-2xl">
        <Accordion type="single" collapsible>
          {FAQ_ITEMS.slice(0, 5).map((item, i) => (
            <AccordionItem key={item.question} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-sm sm:text-base">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mt-6 text-center">
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/faq">Все вопросы</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}

export function CtaSection() {
  return (
    <section className="bg-primary py-12 text-white sm:py-16">
      <div className="page-container max-w-2xl text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">{FINAL_CTA.title}</h2>
        <p className="mt-3 text-base text-emerald-50/90 sm:text-lg">{FINAL_CTA.subtitle}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="secondary" className="h-12 rounded-xl px-10" asChild>
            <Link href="/checkout">
              {withPrice(FREEMIUM.lock.cta)}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="h-12 rounded-xl px-6 text-white hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href="/app">Сначала посчитать бесплатно</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-emerald-50/80">{FINAL_CTA.note}</p>
      </div>
    </section>
  );
}
