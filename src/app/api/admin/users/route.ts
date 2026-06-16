import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { adminCreateUser, adminSetPassword, grantAccess, revokeAccess } from "@/lib/admin-actions";

/**
 * Админ-действия над пользователями/доступом. Только для админа (ADMIN_EMAILS).
 * body: { action: "create"|"password"|"grant"|"revoke", email, password?, grant? }
 */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { action?: string; email?: string; password?: string; grant?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "create": {
        if (!body.password || body.password.length < 6) {
          return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });
        }
        const r = await adminCreateUser(email, body.password, Boolean(body.grant));
        return NextResponse.json({ ok: true, ...r });
      }
      case "password": {
        if (!body.password || body.password.length < 6) {
          return NextResponse.json({ error: "Пароль минимум 6 символов" }, { status: 400 });
        }
        await adminSetPassword(email, body.password);
        return NextResponse.json({ ok: true });
      }
      case "grant":
        await grantAccess(email);
        return NextResponse.json({ ok: true });
      case "revoke":
        await revokeAccess(email);
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
