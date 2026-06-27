/**
 * Вход через Яндекс ID (OAuth). Supabase не имеет встроенного провайдера Яндекса,
 * поэтому делаем свой OAuth-флоу и затем создаём сессию Supabase для пользователя.
 */
import crypto from "crypto";

export function isYandexConfigured(): boolean {
  return Boolean(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET);
}

/**
 * Stateless state для OAuth: подписываем HMAC, чтобы не зависеть от cookie.
 * Это чинит вход «в некоторых браузерах» — in-app webview (Instagram/VK/Telegram),
 * Safari ITP и приватные режимы режут cookie между нашим сайтом и oauth.yandex.ru.
 */
function stateSecret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.YANDEX_CLIENT_SECRET || "kapkap-fallback";
}

export function signYandexState(next: string): string {
  const payload = Buffer.from(JSON.stringify({ next, t: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyYandexState(state: string | null): { next: string } | null {
  if (!state || !state.includes(".")) return null;
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { next?: string; t?: number };
    if (!data.t || Date.now() - data.t > 15 * 60 * 1000) return null; // живёт 15 минут
    const next = typeof data.next === "string" && data.next.startsWith("/") ? data.next : "/app";
    return { next };
  } catch {
    return null;
  }
}

export function yandexAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.YANDEX_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: "login:email login:info",
    // заново показываем окно согласия — чтобы выдались новые права (email)
    force_confirm: "yes",
    state,
  });
  return `https://oauth.yandex.ru/authorize?${params.toString()}`;
}

/** Обмен кода на access_token. */
export async function yandexExchangeCode(
  code: string,
  redirectUri: string,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: process.env.YANDEX_CLIENT_ID!,
    client_secret: process.env.YANDEX_CLIENT_SECRET!,
    redirect_uri: redirectUri,
  });

  const res = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`Яндекс OAuth: ${data.error ?? res.status}`);
  }
  return data.access_token;
}

/** Получить email и имя пользователя по access_token. */
export async function yandexGetUser(
  accessToken: string,
): Promise<{ email: string; name?: string }> {
  const res = await fetch("https://login.yandex.ru/info?format=json", {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  const data = (await res.json()) as {
    login?: string;
    default_email?: string;
    emails?: string[];
    real_name?: string;
    display_name?: string;
  };
  const email = data.default_email ?? data.emails?.[0];
  if (!email) {
    console.error("yandex userinfo (нет email). Поля ответа:", Object.keys(data), "login:", data.login);
    throw new Error("Яндекс не вернул email");
  }
  return { email, name: data.real_name ?? data.display_name };
}
