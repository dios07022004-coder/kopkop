import { NextResponse } from "next/server";
import { isYandexConfigured, yandexAuthorizeUrl } from "@/lib/yandex";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const next = url.searchParams.get("next") ?? "/app";

  if (!isYandexConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=yandex_off`);
  }

  const state = crypto.randomUUID();
  const redirectUri = `${origin}/api/auth/yandex/callback`;
  const res = NextResponse.redirect(yandexAuthorizeUrl(redirectUri, state));

  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("yx_state", state, cookieOpts);
  res.cookies.set("yx_next", next, cookieOpts);
  return res;
}
