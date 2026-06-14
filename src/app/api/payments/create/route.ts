import { NextResponse } from "next/server";
import { createOrder, getProductPrice } from "@/lib/orders";
import { createYooKassaPayment } from "@/lib/yookassa";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Оплата по аккаунту: email берём из сессии, форма не нужна.
    const supabase = await createClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    if (!user?.email) {
      return NextResponse.json(
        { error: "Войдите в аккаунт, чтобы оплатить" },
        { status: 401 },
      );
    }
    const email = user.email;
    const name = (user.user_metadata?.full_name as string | undefined) ?? "";
    const amount = getProductPrice();

    // UTM-метки (необязательно) — для атрибуции трафика в админке
    const rawUtm = (body?.utm ?? {}) as Record<string, unknown>;
    const str = (v: unknown) =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : undefined;
    const utm = {
      source: str(rawUtm.source),
      medium: str(rawUtm.medium),
      campaign: str(rawUtm.campaign),
      content: str(rawUtm.content),
    };

    const order = await createOrder(email, name, amount, utm);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const returnUrl = `${siteUrl}/success?order_id=${order.id}`;

    const payment = await createYooKassaPayment(
      order.id,
      email,
      amount,
      returnUrl,
    );

    const { updateOrderStatus } = await import("@/lib/orders");
    await updateOrderStatus(order.id, "pending", payment.id);

    const confirmationUrl = payment.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      return NextResponse.json(
        { error: "Не удалось получить ссылку на оплату" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      orderId: order.id,
      confirmationUrl,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    const message =
      error instanceof Error ? error.message : "Ошибка создания платежа";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
