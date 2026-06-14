import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEV_AUTH_COOKIE, getDevAuthConfig, isDevAuthSession } from "@/lib/dev-auth";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const devConfig = getDevAuthConfig();
  const devToken = request.cookies.get(DEV_AUTH_COOKIE)?.value;
  const devUser = Boolean(devConfig && isDevAuthSession(devToken));

  if (path.startsWith("/demo")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/downloads")) {
    return new NextResponse(null, { status: 404 });
  }

  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  let isAuthenticated = devUser;

  // Не дёргаем Supabase для анонимных посетителей (нет куки сессии) —
  // иначе каждый заход на /app/login ждёт медленный ответ supabase.co.
  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.includes("-auth-token"));

  if (supabaseConfigured && hasSupabaseAuthCookie) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    isAuthenticated = Boolean(user) || devUser;
  }

  // /app — бесплатное демо, открыто всем. Платные блоки гейтятся в UI.
  // Под защитой остаётся только личный кабинет с файлами.
  if (path.startsWith("/account") && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (path === "/login" && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
