import type { YooKassaPaymentRequest, YooKassaPaymentResponse } from "@/types";

const YOOKASSA_API_URL = "https://api.yookassa.ru/v3";

function getCredentials() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    throw new Error(
      "YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY должны быть заданы в .env",
    );
  }

  return { shopId, secretKey };
}

function getAuthHeader(): string {
  const { shopId, secretKey } = getCredentials();
  const credentials = Buffer.from(`${shopId}:${secretKey}`).toString("base64");
  return `Basic ${credentials}`;
}

export async function createYooKassaPayment(
  orderId: string,
  email: string,
  amount: number,
  returnUrl: string,
): Promise<YooKassaPaymentResponse> {
  const amountValue = amount.toFixed(2);

  const payload: YooKassaPaymentRequest = {
    amount: {
      value: amountValue,
      currency: "RUB",
    },
    capture: true,
    confirmation: {
      type: "redirect",
      return_url: returnUrl,
    },
    description: "Деньги под контролем — калькулятор бюджета (полная версия)",
    metadata: {
      order_id: orderId,
      customer_email: email,
    },
    // Receipt required for 54-FZ when using live payments
    // TODO: verify vat_code and payment_subject values against current YooKassa docs
    receipt: {
      customer: { email },
      items: [
        {
          description: "Деньги под контролем — калькулятор бюджета (цифровой продукт)",
          quantity: "1.00",
          amount: {
            value: amountValue,
            currency: "RUB",
          },
          vat_code: 1,
          payment_mode: "full_payment",
          payment_subject: "service",
        },
      ],
    },
  };

  const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      // orderId уникален → повтор запроса не создаст второй платёж (см. доки ЮKassa)
      "Idempotence-Key": orderId,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`YooKassa API error: ${response.status} — ${errorBody}`);
  }

  return response.json() as Promise<YooKassaPaymentResponse>;
}

export async function getYooKassaPayment(
  paymentId: string,
): Promise<YooKassaPaymentResponse> {
  const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`YooKassa API error: ${response.status} — ${errorBody}`);
  }

  return response.json() as Promise<YooKassaPaymentResponse>;
}

export function isPaymentSuccessful(
  payment: YooKassaPaymentResponse,
): boolean {
  return payment.status === "succeeded" && payment.paid === true;
}
