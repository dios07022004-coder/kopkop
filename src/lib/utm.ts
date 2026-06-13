import type { UtmParams } from "@/types";

export const UTM_COOKIE = "dpc_utm";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 дней

export function parseUtm(params: URLSearchParams): UtmParams {
  const clean = (v: string | null) => (v ? v.slice(0, 120) : undefined);
  return {
    source: clean(params.get("utm_source")),
    medium: clean(params.get("utm_medium")),
    campaign: clean(params.get("utm_campaign")),
    content: clean(params.get("utm_content")),
  };
}

export function hasAnyUtm(u: UtmParams): boolean {
  return Boolean(u.source || u.medium || u.campaign || u.content);
}

/** Клиент: запоминаем первое касание (не перетираем, если уже есть). */
export function captureUtm() {
  if (typeof window === "undefined") return;
  const existing = readUtmCookie();
  if (existing && hasAnyUtm(existing)) return;
  const utm = parseUtm(new URLSearchParams(window.location.search));
  if (!hasAnyUtm(utm)) return;
  document.cookie = `${UTM_COOKIE}=${encodeURIComponent(JSON.stringify(utm))};path=/;max-age=${MAX_AGE};samesite=lax`;
}

export function readUtmCookie(): UtmParams | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${UTM_COOKIE}=`));
  if (!match) return undefined;
  try {
    return JSON.parse(decodeURIComponent(match.split("=")[1])) as UtmParams;
  } catch {
    return undefined;
  }
}

/** Собирает ссылку с UTM-метками для пролива трафика. */
export function buildUtmUrl(base: string, utm: UtmParams): string {
  let url: URL;
  try {
    url = new URL(base.startsWith("http") ? base : `https://${base}`);
  } catch {
    return base;
  }
  if (utm.source) url.searchParams.set("utm_source", utm.source);
  if (utm.medium) url.searchParams.set("utm_medium", utm.medium);
  if (utm.campaign) url.searchParams.set("utm_campaign", utm.campaign);
  if (utm.content) url.searchParams.set("utm_content", utm.content);
  return url.toString();
}
