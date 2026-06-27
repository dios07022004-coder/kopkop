import { NextResponse } from "next/server";
import { isYandexConfigured, yandexAuthorizeUrl, signYandexState } from "@/lib/yandex";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const next = url.searchParams.get("next") ?? "/app";

  if (!isYandexConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=yandex_off`);
  }

  // state подписан HMAC и не зависит от cookie — работает во всех браузерах,
  // включая in-app webview и приватные режимы (cookie там часто режутся).
  const state = signYandexState(next);
  const redirectUri = `${origin}/api/auth/yandex/callback`;
  return NextResponse.redirect(yandexAuthorizeUrl(redirectUri, state));
}
