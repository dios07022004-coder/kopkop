"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_LINKS, PRODUCT } from "@/data/content";
import { cn } from "@/lib/utils";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="page-container flex h-14 items-center justify-between sm:h-16">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold"
            onClick={() => setOpen(false)}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm text-white shadow-sm">
              ₽
            </span>
            <span className="text-sm sm:text-base">{PRODUCT.name}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/login">Войти</Link>
            </Button>
            <Button size="sm" className="rounded-xl px-4" asChild>
              <Link href="/checkout">{PRODUCT.price} ₽</Link>
            </Button>
            <button
              type="button"
              aria-label={open ? "Закрыть меню" : "Открыть меню"}
              className="flex h-11 w-11 items-center justify-center rounded-xl border md:hidden"
              onClick={() => setOpen(!open)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />
      <nav
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-[min(100%,280px)] flex-col bg-background p-5 shadow-xl transition-transform duration-300 safe-bottom md:hidden",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="font-semibold">Меню</span>
          <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-4 py-3.5 text-base active:bg-accent"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-xl px-4 py-3.5 text-base active:bg-accent"
            onClick={() => setOpen(false)}
          >
            Войти
          </Link>
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-6">
          <Button variant="outline" size="lg" className="w-full rounded-xl" asChild>
            <Link href="/app" onClick={() => setOpen(false)}>
              Посчитать бесплатно
            </Link>
          </Button>
          <Button size="lg" className="w-full rounded-xl" asChild>
            <Link href="/checkout" onClick={() => setOpen(false)}>
              Полная версия — {PRODUCT.price} ₽
            </Link>
          </Button>
        </div>
      </nav>
    </>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-secondary/40">
      <div className="page-container py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          <div className="sm:col-span-2 md:col-span-1">
            <p className="font-semibold">{PRODUCT.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Калькулятор личного бюджета: сколько денег свободно, куда их распределить и
              стоит ли покупать сейчас. Без формул и сложных терминов.
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium">Сайт</p>
            <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              <Link href="/app" className="hover:text-foreground">Калькулятор</Link>
              <Link href="/checkout" className="hover:text-foreground">Купить</Link>
              <Link href="/login" className="hover:text-foreground">Войти</Link>
              <Link href="/faq" className="hover:text-foreground">FAQ</Link>
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium">Документы</p>
            <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground">Оферта</Link>
              <Link href="/privacy" className="hover:text-foreground">Конфиденциальность</Link>
            </div>
          </div>
        </div>
        <p className="mt-8 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {PRODUCT.name} · Не является финансовой консультацией
        </p>
      </div>
    </footer>
  );
}
