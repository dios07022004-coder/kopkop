/**
 * Вход через Яндекс ID (OAuth). Supabase не имеет встроенного провайдера Яндекса,
 * поэтому делаем свой OAuth-флоу и затем создаём сессию Supabase для пользователя.
 */

export function isYandexConfigured(): boolean {
  return Boolean(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET);
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
