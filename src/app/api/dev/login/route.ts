import { NextResponse } from "next/server";
import {
  DEV_AUTH_COOKIE,
  getDevAuthConfig,
  verifyDevCredentials,
} from "@/lib/dev-auth";

export async function POST(request: Request) {
  const config = getDevAuthConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Dev auth отключён. Установите DEV_AUTH_BYPASS=true в .env.local" },
      { status: 403 },
    );
  }

  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email ?? "";
  const password = body.password ?? "";

  if (!verifyDevCredentials(email, password)) {
    return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, email: config.email });
  response.cookies.set(DEV_AUTH_COOKIE, config.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
