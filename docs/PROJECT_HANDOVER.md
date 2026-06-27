# Деньги под контролем (kapkapmoney.ru) — полный справочник проекта

> Сводный документ по продукту: архитектура, инфраструктура, фичи, деплой, известные проблемы.
> Используй как точку опоры. Обновляй при крупных изменениях.

## 1. Что это
Веб-сервис личного бюджета: калькулятор «сколько можно тратить в день до зарплаты» + личный кабинет
с аналитикой + Telegram-бот + PWA-приложение с push. Фримиум: базовый ответ бесплатно, полная
версия — разовая оплата 399 ₽ (через YooKassa). Тема сайта — тёмная (премиум).

## 2. Стек
- Next.js 15 (App Router, TS), Tailwind (тёмная тема через `html.dark` + `.dark` палитра в `globals.css`).
- Supabase (Postgres + Auth, RLS, service_role) — БД и авторизация.
- YooKassa — платежи. Resend — письма. web-push (VAPID) — пуши приложения.
- Telegram Bot API через SOCKS5-прокси + поллинг (`scripts/bot-poll.mjs`), т.к. api.telegram.org из РФ заблокирован.
- pm2 (процессы `kopkop` = сайт, `kopkop-bot` = поллер), nginx, certbot.

## 3. Инфраструктура / доступы
- Сервер: Selectel, Ubuntu 24.04, IP **111.88.225.182**, путь **/var/www/kopkop**. SSH: `ssh root@kapkapmoney.ru`.
- Домен: kapkapmoney.ru (reg.ru). Прод-процессы: `pm2 status` → kopkop, kopkop-bot.
- Supabase: текущий проект **vlwqahjjvdljuqeenrvv** (переехали со старого `ckvmtsvzrmigasbpykmz`, тот отпал).
  Бесплатный, регион Ирландия — риск авто-паузы через 7 дней простоя и блокировок из РФ. Долгосрочно — self-hosted на сервере.
- GitHub: dios07022004-coder/kopkop (ветка main). Деплой ручной (без CI).
- Telegram-бот: **@kapkapyourmoneybot**. Админ: **dios07022004@gmail.com** (`ADMIN_EMAILS`).

## 4. Переменные окружения (.env.local на сервере; НЕ коммитить)
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`ADMIN_EMAILS`, `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`,
`TELEGRAM_PROXY_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
`YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`, `PRODUCT_PRICE`.
.env.example — шаблон со всеми ключами.

## 5. База данных (Supabase, схема в `supabase/schema.sql`)
- `profiles` (id, email, full_name) — RLS own.
- `orders` (email, amount, status pending/paid/failed, yookassa_payment_id, utm_*, paid_at) — доступ = оплаченный заказ.
- `calculations` (user_id, label, free, payload jsonb, created_at) — сохранённые расчёты («шаблоны»). RLS own.
- `telegram_users` (tg_id PK, income/mandatory/savings, goal_*, current_balance, min_balance, **payday**, step, user_id, remind_daily, last_remind_on).
- `tg_expenses` — единый **леджер** (траты+доходы): user_id, tg_id, amount, **kind** (expense/income), **source** (tg/web), day(МСК).
- `tg_link_codes` (code, user_id) — одноразовые коды привязки бота.
- `push_subscriptions` (user_id, endpoint, p256dh, auth, last_push_on) — web-push подписки.

## 6. Ключевые механики
- **Якорь расчёта**: Свободно = Доход − Обязательные − Откладываю (`src/lib/finance/core.ts`).
- **Учёт даты зарплаты (cash-flow)**: `src/lib/finance/pay-cycle.ts` — если задан `payday`, считаем по циклу
  [последняя ЗП…следующая], «в день» = (счёт − подушка − траты + доходы) / дней до зарплаты. Иначе календарный месяц. ТЗ: `docs/PAYDAY_CYCLE_SPEC.md`.
- **Единый леджер сайт↔бот**: `getMonthSummaryByUser` в `src/lib/telegram-bot.ts` — общий расчёт для бота, API сайта,
  карточки кабинета. Категории трат — `allocateCategories` (`src/lib/finance/allocation.ts`).
- **Калькулятор = квиз**: `src/components/calculator/calculator-quiz.tsx` (пошагово), результат → кабинет.
- **Кабинет**: `src/app/account/page.tsx` + `src/components/account/month-ledger.tsx` + `analytics-ring.tsx`
  (большой сегментированный круг по категориям, центр День/Месяц, шаблоны сверху, траты ± снизу). Тёмный.
- **Telegram-бот**: `src/lib/telegram-bot.ts` (FSM, дневник трат, /left, /goal, шаблоны inline, +доход),
  вебхук `src/app/api/telegram/webhook/route.ts`, поллер `scripts/bot-poll.mjs` (через прокси + раз в 10 мин дёргает cron).
- **Уведомления**: cron `src/app/api/telegram/cron/route.ts` → Telegram-сводка + web-push (`src/lib/push.ts`),
  утром МСК 9–11, раз в день, только оплатившим. После траты на сайте — push сразу (`addAdjustment`). ТЗ: `docs/PUSH_NOTIFICATIONS_SPEC.md`.
- **Пейволл**: `hasPaidAccess` (`src/lib/access.ts`) и `hasPaidAccessForUser` — доступ = админ или оплаченный заказ.
- **Админка** `/admin`: оплаты, UTM, пользователи + создание аккаунтов, выдача/отзыв доступа, смена пароля
  (`src/components/admin/admin-users.tsx`, `src/app/api/admin/users/route.ts`, `src/lib/admin-actions.ts`).
- **Авторизация**: email+пароль (подтверждение опц.), **Яндекс ID** (`src/app/api/auth/yandex/*`, `src/lib/yandex.ts`).
  Привязка бота по коду (присылается текстом боту) или deep-link `tg://resolve` (t.me в РФ блокируется).

## 7. Деплой (ручной, на сервере)
```bash
ssh root@kapkapmoney.ru
cd /var/www/kopkop
git checkout -- package-lock.json   # если git pull ругается на локальные изменения
git pull origin main
npm install                          # если менялись зависимости
npm run build                        # дождаться "✓ Compiled successfully" (НЕ прерывать)
pm2 restart kopkop kopkop-bot
```
Грабли: команды только строчными (`node`, не `NODE`); вводить по одной; веб-консоль Selectel коверкает
длинные команды с кавычками — лучше Git Bash. Если build обрывается «Killed» — мало RAM, добавить swap.
Тёмная тема — фронт, миграции не нужны.

## 8. Диагностические скрипты (node scripts/...; на сервере)
- `test-tables.mjs` — какие таблицы есть в БД.
- `test-paywall.mjs` — у кого есть доступ.
- `test-notifications.mjs <email>` — каналы уведомлений аккаунта (доступ/Telegram/web-push/VAPID).
- `test-ledger.mjs` — проверка леджера.
- `setup-vapid.mjs` — генерация и запись VAPID в .env.local одной командой.
- `gen-vapid.mjs` — печать VAPID-ключей.
(Все содержат полифилл WebSocket из `ws` для Node 20.)

## 9. Известные проблемы / не доделано (приоритеты)
1. **Безопасность вебхука YooKassa** — есть проверка суммы и переспрос статуса у API, но нет IP-allowlist.
   Главный блокер перед массовыми продажами.
2. **Нет подписочной модели** (рекуррент). На разовых 399 ₽ реклама не окупается → нужен LTV (199–299/мес).
3. **Нет аналитики воронки** (события посчитал→оплатил→вернулся) — нельзя оптимизировать рекламу.
4. **Нет rate-limit** на API; нет мониторинга/алертов.
5. Supabase бесплатный в Ирландии — риск паузы/блокировок; рассмотреть self-hosted в РФ.
6. Подтверждение email сейчас отключено (Confirm email off) для простоты регистрации.

## 10. Оценка
Технически продукт цельный. На 50 000 ₽ в контекст (CPC ~25 ₽ → ~2000 кликов, конверсия 1.5–4%) —
~30–80 продаж, ~12–32 тыс. ₽ с первой когорты (первый заход в минус/ноль). Окупаемость — на повторных
платежах и подписке. Перед масштабом: подписка + аналитика воронки + дожим + соцдоказательства/гарантия.

## 11. Связанные доки
`docs/HANDOVER.md`, `docs/TELEGRAM_BOT_SPEC.md`, `docs/TEMPLATES_LEDGER_SPEC.md`,
`docs/PAYDAY_CYCLE_SPEC.md`, `docs/PUSH_NOTIFICATIONS_SPEC.md`.
