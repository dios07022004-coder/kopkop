import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function sendAccessEmail(params: {
  to: string;
  name: string;
  password: string;
  isNewUser: boolean;
}): Promise<boolean> {
  const { to, name, password, isNewUser } = params;

  if (!resend) {
    console.log("[email stub] Access email to:", to);
    if (isNewUser) console.log("[email stub] Password:", password);
    return false;
  }

  const loginUrl = `${SITE}/login`;

  const body = isNewUser
    ? `
      <p>Здравствуйте, ${name}!</p>
      <p>Оплата прошла успешно. Ваш доступ к «Деньги под контролем»:</p>
      <ul>
        <li><strong>Логин:</strong> ${to}</li>
        <li><strong>Пароль:</strong> ${password}</li>
      </ul>
      <p><a href="${loginUrl}">Войти на сайт</a></p>
      <p>После входа откроются калькуляторы и файлы таблицы.</p>
      <p>Рекомендуем сменить пароль после первого входа.</p>
    `
    : `
      <p>Здравствуйте, ${name}!</p>
      <p>Оплата прошла успешно. Используйте ваш существующий пароль:</p>
      <p><a href="${loginUrl}">Войти на сайт</a></p>
    `;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Доступ к «Деньги под контролем»",
    html: body,
  });

  if (error) {
    console.error("Resend error:", error);
    return false;
  }
  return true;
}
