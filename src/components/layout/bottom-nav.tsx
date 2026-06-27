"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calculator, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Главная", icon: Home, match: (p: string) => p === "/" },
  { href: "/app", label: "Калькулятор", icon: Calculator, match: (p: string) => p.startsWith("/app") },
  { href: "/account", label: "Кабинет", icon: Wallet, match: (p: string) => p.startsWith("/account") },
];

/** Нижняя app-навигация для мобильных. Скрыта на десктопе и в standalone-печати. */
export function BottomNav() {
  const pathname = usePathname() || "/";
  // не показываем на экранах входа/оплаты — там свой фокус
  if (["/login", "/register", "/checkout", "/success"].some((p) => pathname.startsWith(p))) {
    return null;
  }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "scale-110")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
