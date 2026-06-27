import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AnalyticsScripts } from "@/components/analytics/analytics-scripts";
import { PwaRegister } from "@/components/pwa-register";
import { InstallBanner } from "@/components/install-banner";
import { UtmCapture } from "@/components/utm-capture";
import { Header, Footer } from "@/components/layout/header-footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DEFAULT_METADATA } from "@/lib/seo/metadata";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = DEFAULT_METADATA;

export const viewport: Viewport = {
  themeColor: "#1f9d6b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Header />
        <main className="min-h-[calc(100vh-8rem)] pb-16 md:pb-0">{children}</main>
        <Footer />
        <BottomNav />
        <AnalyticsScripts />
        <PwaRegister />
        <InstallBanner />
        <UtmCapture />
      </body>
    </html>
  );
}
