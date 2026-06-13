"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "register" | "verify";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export function AuthForm({ defaultMode = "login" }: { defaultMode?: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app";
  const supabaseReady = isSupabaseConfigured();

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  function done() {
    router.push(next);
    router.refresh();
  }

  async function handleGoogle() {
    setError("");
    if (!supabaseReady) {
      setError("Supabase не настроен");
      return;
    }
    const supabase = createClient();
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    // Локальный режим без Supabase — только вход через dev-эндпоинт
    if (!supabaseReady) {
      try {
        const res = await fetch("/api/dev/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) return setError(data.error ?? "Неверный email или пароль");
        done();
      } catch {
        setLoading(false);
        setError("Ошибка входа");
      }
      return;
    }

    const supabase = createClient();

    if (mode === "login") {
      const { error: e1 } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (e1) return setError("Неверный email или пароль");
      done();
      return;
    }

    if (mode === "register") {
      const { data, error: e2 } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (e2) return setError(e2.message || "Не удалось зарегистрироваться");
      if (data.session) {
        done(); // подтверждение email отключено — сразу вошли
        return;
      }
      setInfo("Мы отправили код на ваш email. Введите его ниже.");
      setMode("verify");
      return;
    }

    if (mode === "verify") {
      const { error: e3 } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      setLoading(false);
      if (e3) return setError("Неверный или просроченный код");
      done();
      return;
    }
  }

  const titleByMode: Record<Mode, string> = {
    login: "Вход",
    register: "Регистрация",
    verify: "Подтверждение почты",
  };

  return (
    <form onSubmit={onSubmit} className="soft-card mx-auto max-w-md space-y-4 p-6">
      <p className="text-center text-lg font-semibold">{titleByMode[mode]}</p>

      {mode !== "verify" && supabaseReady && (
        <>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-2"
            onClick={handleGoogle}
          >
            <GoogleIcon />
            Продолжить с Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            или по почте
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      {mode === "verify" ? (
        <div className="space-y-1.5">
          <Label htmlFor="code">Код из письма</Label>
          <Input
            id="code"
            inputMode="numeric"
            required
            value={code}
            placeholder="6 цифр"
            className="h-11 text-center text-lg tracking-widest"
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              className="h-11"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              className="h-11"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </>
      )}

      {error && <p className="text-sm text-[hsl(var(--danger))]">{error}</p>}
      {info && <p className="text-sm text-primary">{info}</p>}

      <Button type="submit" className="h-11 w-full" disabled={loading}>
        {loading
          ? "…"
          : mode === "login"
            ? "Войти"
            : mode === "register"
              ? "Зарегистрироваться"
              : "Подтвердить"}
      </Button>

      {supabaseReady && mode === "login" && (
        <p className="text-center text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <button
            type="button"
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Зарегистрироваться
          </button>
        </p>
      )}
      {supabaseReady && mode === "register" && (
        <p className="text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <button
            type="button"
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Войти
          </button>
        </p>
      )}
      {mode === "verify" && (
        <p className="text-center text-xs text-muted-foreground">
          Не пришёл код? Проверьте папку «Спам» или{" "}
          <Link href="/login" className="text-primary hover:underline">
            начните заново
          </Link>
          .
        </p>
      )}
    </form>
  );
}

/** Совместимость со старым импортом на /login */
export function LoginForm() {
  return <AuthForm defaultMode="login" />;
}
