# Деньги под контролём (kapkapmoney.ru) — журнал проекта и инструкция

Структурированный лог всего, что сделано, как настроено и что осталось.
Это рабочая «передача дел» вместо сырого чата.

## 1. Что за продукт
Калькулятор личного бюджета + продающий лендинг. Бесплатно — базовая цифра
(«сколько свободно»), платно (399 ₽) — полный план: распределение по категориям,
накопления, решение о покупке, история, экспорт в Excel, шаблон.

Главная финансовая идея (один якорь): **Свободно = Доход − Обязательные**.
Из этой суммы пользователь решает: сколько копить, сколько тратить, что купить.
Счёт и подушка — отдельный индикатор «здоровье счёта», не примешивается к бюджету.

## 2. Стек
- Next.js 15 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth) — БД и авторизация
- YooKassa — платежи
- Resend — письма (через SMTP в Supabase)
- PWA (manifest + service worker)

## 3. Инфраструктура (боевая)
| Что | Значение |
|---|---|
| Домен | **kapkapmoney.ru** (reg.ru, A @/www → IP сервера) |
| Сервер | Selectel, Ubuntu 24.04, 2 vCPU / 4 ГБ, IP **111.88.225.182** |
| Путь на сервере | `/var/www/kopkop` |
| Процесс | pm2 `kopkop` (`next start`, порт 3000), nginx-прокси + SSL (certbot) |
| Supabase ref | `ckvmtsvzrmigasbpykmz` |
| GitHub | `dios07022004-coder/kopkop` (деплой вручную, без Actions) |
| Админ | `dios07022004@gmail.com` (ADMIN_EMAILS) |

## 4. Деплой (вручную, из Git Bash на ПК)
```bash
ssh root@111.88.225.182 "cd /var/www/kopkop && git pull origin main && npm run build && pm2 reload kopkop"
```
(Можно завести alias `deploy`.) GitHub Actions отключён намеренно (биллинг).

## 5. Переменные окружения (.env.local на сервере — НЕ в Git)
```
NEXT_PUBLIC_SITE_URL=https://kapkapmoney.ru
NEXT_PUBLIC_SUPABASE_URL=https://ckvmtsvzrmigasbpykmz.supabase.co   # без /rest/v1/!
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # Supabase → Settings → API Keys
SUPABASE_SERVICE_ROLE_KEY=...            # там же (service_role / secret)
ADMIN_EMAILS=dios07022004@gmail.com
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=Деньги под контролем <noreply@kapkapmoney.ru>
YANDEX_CLIENT_ID=...                      # oauth.yandex.ru
YANDEX_CLIENT_SECRET=...
PRODUCT_PRICE=399
```
`NEXT_PUBLIC_*` вшиваются при `npm run build` — после их изменения нужна пересборка.

## 6. Реализовано
- **Лендинг**: hero с живым мини-демо, анимации появления при скролле, премиум-оформление,
  блоки «Было→Стало», «Как работает», пример с Аней, инструменты, бесплатно/платно, цена+гарантия, FAQ, CTA.
- **Калькулятор `/app`** (бесплатное демо): главная цифра + waterfall + светофор; вкладки
  «Распределить» (donut + 50/30/20 + редактируемые %), «Накопить» (план + размен), «Купить» (вердикт + размен).
  «Подробно» — формулы/проверка/что-если свёрнуты.
- **Доступ к платному — только после оплаты** (оплаченный заказ на email) + админ всегда.
- **Авторизация**: вход/регистрация по email+паролю с подтверждением **кодом**,
  **вход через Яндекс ID**, **восстановление пароля по коду**, выход. Google убран.
- **История расчётов** — привязана к аккаунту (Supabase), для анонимов — localStorage.
- **Экспорт в Excel** (.xlsx) — полный разбор с разделами и пояснениями.
- **Админка `/admin`** (по ADMIN_EMAILS): выручка/оплаты/пользователи, графики по дням и источникам,
  **UTM-конструктор** и **таблица трафика по каждой UTM-метке**.
- **UTM-атрибуция**: метки запоминаются (cookie) и пишутся в заказ.
- **PWA**: устанавливается на телефон; Я.Метрика (счётчик 109826870).
- Заказы — в Supabase (таблица `orders`), webhook YooKassa создаёт пользователя и шлёт письмо.

## 7. Настройка внешних сервисов (чек-лист)
- **Supabase SQL**: выполнить `supabase/schema.sql` (таблицы profiles, orders, calculations).
- **Supabase Auth → Providers**: Email вкл. (Confirm email — по желанию), Yandex — через кастомный OAuth (в коде).
- **Supabase Auth → URL Configuration**: Site URL `https://kapkapmoney.ru`, Redirect `https://kapkapmoney.ru/auth/callback`.
- **Supabase Emails → Templates**: «Confirm signup» и «Reset password» — тело с `{{ .Token }}` (код, не ссылка).
- **Supabase SMTP**: smtp.resend.com:465, user `resend`, pass = Resend API key, sender с домена kapkapmoney.ru (Verified в Resend).
- **Resend → Domains**: kapkapmoney.ru = Verified (DNS-записи в зоне kapkapmoney.ru).
- **Яндекс OAuth** (oauth.yandex.ru): Redirect URI `https://kapkapmoney.ru/api/auth/yandex/callback`, права login:email + login:info.
- **YooKassa**: ключи в .env.local; webhook `https://kapkapmoney.ru/api/payments/webhook`, событие `payment.succeeded`.

## 8. ⚠️ Что НЕ доделано (по приоритету)
1. **Безопасность webhook YooKassa** — сейчас принимает уведомление без проверки IP/подписи и без сверки суммы. Закрыть до реальных платежей.
2. **supabase.co заблокирован РКН** — клиентские запросы к Supabase у части пользователей могут не проходить. Решение на будущее: прокси Supabase через свой домен или перенос на РФ-инфраструктуру.
3. **Письмо после оплаты** — пароль шлётся в открытом виде; лучше magic-link/одноразовый.
4. **IDOR на `/api/orders/[id]`** — отдаёт данные без проверки прав (исторический эндпоинт), закрыть/убрать.
5. **Email/имя в письме** — экранировать (HTML-инъекция).
6. Excel без цветных стилей (xlsx community не умеет) — при желании `xlsx-js-style`.

## 9. Структура кода (ключевое)
- `src/app/page.tsx` — лендинг; `src/components/landing/*` — секции, hero-demo, reveal-анимации.
- `src/app/app/page.tsx` + `src/components/calculator/*` — калькулятор (primary-answer, allocation-tab, purchase-tab, monthly-tradeoff, charts, locked-feature).
- `src/lib/finance/*` — финансовое ядро (источник правды формул) + тесты.
- `src/app/admin/page.tsx` + `src/components/admin/*` — админка, графики, UTM.
- `src/components/auth/login-form.tsx` — вход/регистрация/код/Яндекс/сброс пароля.
- `src/lib/access.ts` — доступ к платному (оплата/админ).
- `src/lib/orders.ts` — заказы (Supabase + JSON-fallback).
- `src/lib/yandex.ts` + `src/app/api/auth/yandex/*` — вход через Яндекс.
- `supabase/schema.sql` — схема БД.
