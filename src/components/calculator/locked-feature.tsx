"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FREEMIUM, PRODUCT } from "@/data/content";
import { cn } from "@/lib/utils";

interface LockedFeatureProps {
  /** Есть ли у пользователя платный доступ */
  unlocked: boolean;
  /** Текст-описание того, что откроется (из FREEMIUM.lock) */
  description: string;
  /** Превью платного блока — показывается размытым под оверлеем */
  children: React.ReactNode;
  className?: string;
}

export function LockedFeature({
  unlocked,
  description,
  children,
  className,
}: LockedFeatureProps) {
  if (unlocked) {
    return <div className={className}>{children}</div>;
  }

  const cta = FREEMIUM.lock.cta.replace("{price}", String(PRODUCT.price));

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <div className="lock-blur" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/70 p-5 text-center backdrop-blur-[2px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Lock className="h-3.5 w-3.5" />
          {FREEMIUM.lock.badge}
        </span>
        <p className="max-w-xs text-sm font-medium text-foreground">{description}</p>
        <Button size="sm" className="rounded-xl" asChild>
          <Link href="/checkout">{cta}</Link>
        </Button>
      </div>
    </div>
  );
}
