import type { Metadata } from "next";
import { PRODUCT } from "@/data/content";

export const SITE_NAME = PRODUCT.shortName;
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  noindex?: boolean;
};

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function buildPageMetadata({
  title,
  description,
  path,
  ogImage,
  noindex = false,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const image = ogImage ?? absoluteUrl("/opengraph-image");

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noindex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      url,
      siteName: PRODUCT.name,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function buildJsonLd<T extends Record<string, unknown>>(data: T): string {
  return JSON.stringify(data);
}

export const DEFAULT_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${PRODUCT.name} — калькулятор бюджета`,
    template: `%s | ${SITE_NAME}`,
  },
  description: PRODUCT.tagline,
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: PRODUCT.name,
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Деньги",
    statusBarStyle: "default",
  },
};
