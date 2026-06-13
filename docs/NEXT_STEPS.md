# Что делать дальше — пошагово

Код продукта готов к локальной работе. Для реальных продаж и выдачи доступа подключите сервисы ниже **по порядку**.

---

## 1. Google Sheets (ваша таблица)

Ссылка: [Ваши деньги](https://docs.google.com/spreadsheets/d/1f4i4aiETE8C3vGxZ4BNx6ValJ6Bhwf8iW5m1JZRv_Tw/edit?usp=sharing)

Сейчас таблица **пустая** — это нормально. Нужно один раз залить шаблон:

1. Локально: `npm run generate:template` → файл `private/downloads/budget-tracker-template.xlsx`
2. В Google Sheets: **Файл → Импорт → Загрузка** → выберите этот xlsx
3. Убедитесь, что появилось **8 листов** (Распределение, Цели и т.д.)
4. В `.env.local` уже указан `PRODUCT_GOOGLE_SHEETS_URL` на вашу таблицу

Покупатели увидят кнопку «Google Sheets» в личном кабинете.

---

## 2. Supabase (вход и аккаунты)

1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте в `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. После оплаты webhook создаёт пользователя и шлёт пароль на email

**Локально без Supabase:** оставьте `DEV_AUTH_BYPASS=true` и входите как `test@local.dev` / `Test1234!`

---

## 3. YooKassa (оплата 399 ₽)

1. Регистрация на [yookassa.ru](https://yookassa.ru)
2. В `.env.local`: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`
3. Webhook в кабинете YooKassa: `https://ВАШ-ДОМЕН.ru/api/payments/webhook`, событие `payment.succeeded`
4. `NEXT_PUBLIC_SITE_URL` — ваш реальный домен (не localhost)

---

## 4. Resend (письма после оплаты)

1. [resend.com](https://resend.com) → API key
2. `.env.local`: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (домен должен быть верифицирован)
3. В письме: логин, пароль, ссылка на `/login`

---

## 5. Деплой сайта

Подойдёт Vercel, Railway или VPS:

```bash
npm run build
npm run generate:template   # перед деплоем — положить xlsx в private/downloads
```

На сервере **не включайте** `DEV_AUTH_BYPASS`.

---

## 6. SEO и аналитика (после домена)

- Google Search Console + Яндекс.Вебмастер — добавить сайт, отправить sitemap `/sitemap.xml`
- Опционально: `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_YM_ID` в `.env`

---

## 7. Проверка перед запуском

| Действие | Команда / URL |
|----------|----------------|
| Тесты расчётов | `npm test` |
| Excel шаблон | `npm run verify:template` |
| Главная | `/` — hero с 70 000 ₽/мес |
| Калькулятор | `/app` → редирект на `/login` если не вошли |
| Файлы | `/account` → Excel и инструкция (после входа) |
| Оплата | `/checkout` → тестовый платёж YooKassa |

---

## Кратко: минимум для «работает у клиента»

1. Импорт xlsx в Google Sheets  
2. Supabase + Resend + YooKassa  
3. Деплой с правильным `NEXT_PUBLIC_SITE_URL`  
4. Отключить dev-вход  

Вопросы по настройке — пишите, разберём конкретный шаг.
