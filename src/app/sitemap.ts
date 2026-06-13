import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/metadata";

const PUBLIC_PATHS = ["/", "/app", "/checkout", "/faq", "/terms", "/privacy"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
