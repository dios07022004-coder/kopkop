import { NextResponse } from "next/server";
import { getOrderById, getProductLinks } from "@/lib/orders";
import { getYooKassaPayment, isPaymentSuccessful } from "@/lib/yookassa";
import { updateOrderStatus } from "@/lib/orders";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await params;
    const order = await getOrderById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    // If user returns from YooKassa before webhook, verify payment status
    if (order.status === "pending" && order.yookassaPaymentId) {
      try {
        const payment = await getYooKassaPayment(order.yookassaPaymentId);
        if (isPaymentSuccessful(payment)) {
          await updateOrderStatus(order.id, "paid", payment.id);
          order.status = "paid";
        }
      } catch {
        // YooKassa credentials may not be configured in dev
      }
    }

    return NextResponse.json({
      status: order.status,
      email: order.email,
      links: getProductLinks(),
    });
  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
