export const DEV_AUTH_COOKIE = "dev-auth-token";

export interface DevAuthConfig {
  email: string;
  password: string;
  token: string;
}

export function getDevAuthConfig(): DevAuthConfig | null {
  // Встроенного тестового аккаунта НЕТ. Dev-вход включается только если
  // разработчик ЯВНО задал все три переменные окружения. В production — никогда.
  if (process.env.NODE_ENV !== "development") return null;
  if (process.env.DEV_AUTH_BYPASS !== "true") return null;

  const email = process.env.DEV_AUTH_EMAIL;
  const password = process.env.DEV_AUTH_PASSWORD;
  const token = process.env.DEV_AUTH_TOKEN;

  if (!email || !password || !token) return null;

  return { email, password, token };
}

export function isDevAuthSession(token: string | undefined): boolean {
  const config = getDevAuthConfig();
  if (!config || !token) return false;
  return token === config.token;
}

export function verifyDevCredentials(email: string, password: string): boolean {
  const config = getDevAuthConfig();
  if (!config) return false;
  return (
    email.toLowerCase() === config.email.toLowerCase() &&
    password === config.password
  );
}
