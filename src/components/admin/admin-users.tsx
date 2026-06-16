"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AdminUserRow = {
  email: string;
  created: string;
  lastSignIn: string | null;
  paid: boolean;
};

const fmtDate = (iso?: string | null) =>
  !iso
    ? "—"
    : new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

async function call(action: string, payload: Record<string, unknown>) {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Ошибка");
  return data;
}

export function AdminUsers({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grant, setGrant] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = () => router.refresh();

  const create = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await call("create", { email, password, grant });
      setMsg({ ok: true, text: `Аккаунт ${email} создан${grant ? " с доступом" : ""}` });
      setEmail("");
      setPassword("");
      refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: string, targetEmail: string) => {
    setMsg(null);
    try {
      if (action === "password") {
        const pw = window.prompt(`Новый пароль для ${targetEmail} (мин. 6 символов):`);
        if (!pw) return;
        await call("password", { email: targetEmail, password: pw });
        setMsg({ ok: true, text: `Пароль для ${targetEmail} обновлён` });
        return;
      }
      if (action === "revoke" && !window.confirm(`Отозвать доступ у ${targetEmail}?`)) return;
      await call(action, { email: targetEmail });
      setMsg({ ok: true, text: action === "grant" ? `Доступ выдан: ${targetEmail}` : `Доступ отозван: ${targetEmail}` });
      refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      {/* Создание аккаунта */}
      <div className="soft-card p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <UserPlus className="h-4 w-4 text-primary" /> Создать аккаунт
        </h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} className="sm:w-64" />
          <Input
            placeholder="пароль (мин. 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sm:w-48"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={grant} onChange={(e) => setGrant(e.target.checked)} />
            выдать доступ
          </label>
          <Button onClick={create} disabled={busy || !email || !password}>
            {busy ? "Создаём…" : "Создать"}
          </Button>
        </div>
      </div>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-[hsl(var(--success))]" : "text-[hsl(var(--danger))]"}`}>
          {msg.text}
        </p>
      )}

      {/* Список пользователей с действиями */}
      <div className="soft-card overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-border/60 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Доступ</th>
              <th className="px-4 py-3 font-medium">Регистрация</th>
              <th className="px-4 py-3 font-medium">Последний вход</th>
              <th className="px-4 py-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Пользователей пока нет
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.email} className="border-b border-border/40 last:border-0">
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  {u.paid ? (
                    <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium surface-success">
                      есть
                    </span>
                  ) : (
                    <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium surface-warning">
                      нет
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(u.created)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(u.lastSignIn)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {u.paid ? (
                      <Button variant="outline" size="sm" onClick={() => act("revoke", u.email)}>
                        <ShieldOff className="mr-1 h-3.5 w-3.5" /> Отозвать
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => act("grant", u.email)}>
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Выдать
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => act("password", u.email)}>
                      <KeyRound className="mr-1 h-3.5 w-3.5" /> Пароль
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
