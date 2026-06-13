"use client";

import Link from "next/link";
import { PRODUCT } from "@/data/content";

/** Sticky CTA bar on mobile landing — бесплатно посчитать + купить */
export function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-border/60 bg-background/95 p-3 backdrop-blur-md safe-bottom sm:hidden">
      <Link
        href="/app"
        className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-card text-sm font-medium"
      >
        Посчитать
      </Link>
      <Link
        href="/checkout"
        className="flex h-11 flex-[1.4] items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground shadow-sm"
      >
        Полная версия — {PRODUCT.price} ₽
      </Link>
    </div>
  );
}
