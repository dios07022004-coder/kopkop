import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/api", "/login", "/success", "/downloads"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
