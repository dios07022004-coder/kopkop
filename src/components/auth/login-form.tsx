"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "register" | "verify";

function YandexIcon() {
  return (
    <span
      className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FC3F1D] text-[13px] font-bold text-white"
      aria-hidden
    >
      Я
    </span>
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
  const [error, setError] = useState(
    searchParams.get("error") ? "Не удалось войти через Яндекс. Попробуйте ещё раз или по почте." : "",
  );
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  function done() {
    router.push(next);
    router.refresh();
  }

  const yandexHref = `/api/auth/yandex/start?next=${encodeURIComponent(next)}`;

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
      // Supabase для уже существующего email возвращает пользователя с пустым identities
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError("Этот email уже зарегистрирован. Войдите или восстановите пароль.");
        setMode("login");
        return;
      }
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
        type: "signup",
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
          <a
            href={yandexHref}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-input bg-background text-sm font-medium shadow-sm transition-colors hover:bg-accent"
          >
            <YandexIcon />
            Войти через Яндекс
          </a>
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
