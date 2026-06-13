# Деньги под контролем — калькулятор бюджета

Продающий сайт цифрового продукта на Next.js: калькулятор бюджета, оплата через YooKassa, выдача файлов после покупки.

## Что внутри

- **Лендинг** (`/`) — hero, walkthrough с реальными цифрами, FAQ, цена 399 ₽
- **Checkout** (`/checkout`) — форма заказа + YooKassa
- **Калькулятор** (`/app`) — бюджет, накопления, решение о покупке (после оплаты)
- **FAQ, оферта, политика конфиденциальности**
- **Excel-шаблон** — 8 листов с формулами, синхрон с `src/lib/finance/`
- **HTML-инструкция** — `private/downloads/instruction.html` (можно сохранить как PDF)

## Быстрый старт

```bash
npm install
npm run generate:template
cp .env.example .env.local
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

Dev-вход (если `DEV_AUTH_BYPASS=true`): `test@local.dev` / `Test1234!`

## Проверка Excel

```bash
npm run generate:template   # private/downloads/budget-tracker-template.xlsx
npm run verify:template     # структура и формулы
npm test                    # excel-sync.test.ts — сверка с computeFinance()
```

В development: `GET /api/dev/verify-export` — JSON-отчёт проверки шаблона.

### Google Sheets

1. Сгенерируйте Excel: `npm run generate:template`
2. Импортируйте в Google Sheets
3. Сверьте **B16–B18** на листе «Распределение» с калькулятором на `/app`
4. Укажите ссылку «копировать шаблон» в `PRODUCT_GOOGLE_SHEETS_URL`

## Настройка YooKassa

```env
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
NEXT_PUBLIC_SITE_URL=https://ваш-домен.ru
PRODUCT_GOOGLE_SHEETS_URL=https://docs.google.com/spreadsheets/d/.../copy
NEXT_PUBLIC_GA_ID=          # опционально
NEXT_PUBLIC_YM_ID=          # опционально
```

Webhook: `https://ваш-домен.ru/api/payments/webhook` · событие `payment.succeeded`

## Структура проекта

```
src/
  app/              # страницы, sitemap, robots, OG-image
  components/       # UI, лендинг, калькулятор
  lib/finance/      # расчёты (источник правды)
  lib/seo/          # metadata helper
private/
  downloads/        # Excel + instruction (только через /api/downloads)
scripts/
  generate-template.mjs
  verify-template.mjs
```

Файлы **не** лежат в `public/` — прямой доступ к `/downloads/*` заблокирован middleware.

## SEO

- `src/lib/seo/metadata.ts` — canonical, OG, Twitter
- `/sitemap.xml`, `/robots.txt`
- JSON-LD на `/`, `/faq`, `/checkout`, `/terms`, `/privacy`
- `/app`, `/login`, `/success` — `noindex`

## TODO для продакшена

- [ ] Supabase + YooKassa + Resend в production
- [ ] Google Search Console / Яндекс.Вебмастер
- [ ] Реальный Google Sheets шаблон
- [ ] OG-image с брендом (сейчас генерируется автоматически)
- [ ] Реальные отзывы или убрать блок на лендинге

## Цена

**399 ₽** — задаётся в `src/data/content.ts` (`PRODUCT.price`).
