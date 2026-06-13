import { NextResponse } from "next/server";
import {
  getOrderById,
  getOrderByPaymentId,
  updateOrderStatus,
} from "@/lib/orders";
import { provisionUserAfterPayment } from "@/lib/auth-provision";
import { sendAccessEmail } from "@/lib/email";
import { getYooKassaPayment, isPaymentSuccessful } from "@/lib/yookassa";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // YooKassa webhook format — verify against current docs:
    // https://yookassa.ru/developers/using-api/webhooks
    const event = body.event as string | undefined;
    const paymentObject = body.object as { id?: string; status?: string; paid?: boolean; metadata?: { order_id?: string } } | undefined;

    if (event !== "payment.succeeded" && event !== "payment.waiting_for_capture") {
      return NextResponse.json({ received: true });
    }

    const paymentId = paymentObject?.id;
    if (!paymentId) {
      return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
    }

    const payment = await getYooKassaPayment(paymentId);

    if (!isPaymentSuccessful(payment)) {
      return NextResponse.json({ received: true });
    }

    const orderId = payment.metadata?.order_id;
    let order = orderId ? await getOrderById(orderId) : null;

    if (!order) {
      order = await getOrderByPaymentId(paymentId);
    }

    if (!order) {
      console.error("Order not found for payment:", paymentId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "paid") {
      await updateOrderStatus(order.id, "paid", paymentId);

      try {
        const provision = await provisionUserAfterPayment(order.email, order.name);
        await sendAccessEmail({
          to: order.email,
          name: order.name,
          password: provision?.password ?? "",
          isNewUser: provision?.created ?? false,
        });
      } catch (err) {
        console.error("Post-payment provisioning failed:", err);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
