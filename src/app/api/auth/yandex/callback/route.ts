import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { yandexExchangeCode, yandexGetUser } from "@/lib/yandex";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("yx_state")?.value;
  const next = cookieStore.get("yx_next")?.value ?? "/app";

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${reason}`);

  if (!code || !state || !savedState || state !== savedState) {
    return fail("yandex_state");
  }
  if (!isSupabaseAdminConfigured()) {
    return fail("supabase_off");
  }

  try {
    const redirectUri = `${origin}/api/auth/yandex/callback`;
    const token = await yandexExchangeCode(code, redirectUri);
    const { email, name } = await yandexGetUser(token);

    const admin = createAdminClient();
    // создаём пользователя, если его ещё нет (ошибку "уже существует" игнорируем)
    await admin.auth.admin
      .createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: name, provider: "yandex" },
      })
      .catch(() => {});

    // генерируем одноразовый токен и устанавливаем сессию (ставит cookie)
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (linkErr || !tokenHash) return fail("yandex_link");

    const supabase = await createClient();
    if (!supabase) return fail("supabase_off");
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    if (verifyErr) return fail("yandex_session");

    return NextResponse.redirect(`${origin}${next}`);
  } catch {
    return fail("yandex");
  }
}
