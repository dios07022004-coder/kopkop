# «Деньги под контролем» — полная логика продукта

**Версия:** 1.2  
**Дата:** 12.06.2026  
**Назначение документа:** основа для ТЗ на разработку, маркетинг и масштабирование продукта

---

## 1. Суть продукта

### 1.1. Что это
Цифровой продукт «Деньги под контролем» — **личный финансовый инструмент**, который за минуту отвечает на три вопроса:

1. **Сколько можно тратить** (без стресса и без вреда резерву)
2. **В каком состоянии бюджет** (спокойно / осторожно / опасно)
3. **Стоит ли покупать** желаемую вещь сейчас (купить / подождать / отложить / сначала резерв)

### 1.2. Что покупает клиент (399 ₽)
| Компонент | Формат |
|-----------|--------|
| Таблица-бюджет | Google Sheets + Excel (.xlsx) |
| Калькуляторы | На сайте после оплаты (`/app`) — Бюджет, Накопить, Покупка |
| Инструкция | HTML |
| Сайт | Лендинг, оплата, auth, выдача файлов |

### 1.3. Для кого
- **Студент** — понять лимит трат
- **Фрилансер** — нерегулярный доход, нужен резерв
- **Семья** — много обязательных статей, решения о крупных покупках

### 1.4. Позиционирование
- **Не:** инвестиции, консалтинг, сложный финтех
- **Да:** готовый ответ, спокойствие, разовая оплата

---

## 2. Архитектура: один источник правды

Вся математика живёт в **`src/lib/finance/`**. Сайт, Excel и будущие каналы (бот, приложение) должны использовать **одни и те же формулы**.

```
src/lib/finance/
  types.ts           — типы входа/выхода
  constants.ts       — пороги, категории, дефолты
  normalize.ts       — очистка ввода + zod
  core.ts            — computeBudgetCore() — формулы
  allocation.ts      — распределение по категориям
  purchase-decision.ts — decidePurchase() — дерево решений
  copy.ts            — тексты статусов (RU)
  savings-goal.ts     — computeSavingsGoal() — цели накопления
  savings-copy.ts     — тексты статусов «Накопить» (RU)
```

**Публичный вызов:**
```typescript
computeFinance(budgetInput, purchaseInput?, savingsGoalInput?) → { core, allocation, purchase?, savingsGoal? }
```

---

## 3. Глоссарий сущностей

| ID | Русское имя в UI | Горизонт | Смысл |
|----|------------------|----------|-------|
| `incomeMonthly` | Доход за месяц | month | Ожидаемый доход до конца периода |
| `currentBalance` | На счёте сейчас | snapshot | Текущий остаток на карте/счёте |
| `mandatoryMonthly` | Обязательные траты | month | Аренда, кредиты, коммуналка — суммой |
| `plannedVariableMonthly` | Плановые переменные | month | Еда, транспорт — уже в бюджете |
| `savingsMonthly` | Копилка / цели | month | Ежемесячное отложение |
| `minimumBalance` | Минимум на счёте | snapshot | Подушка — ниже нельзя опускаться |
| `reserveTarget` | Цель подушки (опц.) | goal | Прогресс-бар, не блокирует траты |

**Важно:** `minimumBalance` ≠ `reserveTarget`. Минимум защищает от импulsive трат; цель — долгосрочная накопительная цель.

---

## 4. Входные данные

### 4.1. BudgetInput (бюджет)

| Поле | Обязательно | Дефолт демо | Валидация |
|------|-------------|-------------|-----------|
| incomeMonthly | да | 80 000 | ≥ 0 |
| currentBalance | да | 45 000 | ≥ 0 |
| mandatoryMonthly | да | 40 000 | ≥ 0 |
| minimumBalance | да | 30 000 | ≥ 0 |
| plannedVariableMonthly | нет | 0 | ≥ 0 |
| savingsMonthly | нет | 0 | ≥ 0 |
| mandatoryExpenses[] | нет | 1 строка | для детализации |
| categories[] | нет | 5 категорий | для распределения |

### 4.2. PurchaseInput (покупка)

| Поле | Дефолт | Диапазон |
|------|--------|----------|
| price | 35 000 | ≥ 0 |
| urgency | 3 | 1–5 |
| usefulness | 4 | 1–5 |

### 4.3. Демо UI — 5 полей на главном экране
1. Доход за месяц  
2. На счёте сейчас  
3. Обязательные траты (одной суммой)  
4. Минимум на счёте  
5. Цена покупки (0 = не проверять)

Остальное — в «Дополнительные настройки».

---

## 5. Формулы ядра (`computeBudgetCore`)

### 5.1. Два разных «лимита на траты» — ключевая идея

Пользователю показываются **две разные цифры**, и это не ошибка:

| Метрика | ID | Формула | Что означает для человека |
|---------|-----|---------|---------------------------|
| **Из дохода** | `freeBudgetMonthly` | `income − mandatory − variable − savings` | Сколько стабильно остаётся **каждый месяц из зарплаты** |
| **На жизнь (всего)** | `availableForLife` | `MAX(0, balance + income − mandatory − savings − minimum)` | Сколько можно потратить **в этом месяце с учётом денег на счёте** |

**Пример (ваш кейс):** доход 100k, счёт 100k, обязательное 50k, копилка 10k, резерв 15k:
- Из дохода: **40 000 ₽/мес**
- На жизнь всего: **125 000 ₽** (100+100−50−10−15)

### 5.2. Полный список формул

```
remainingAfterMandatory = incomeMonthly − mandatoryMonthly

freeBudgetMonthly = remainingAfterMandatory − plannedVariableMonthly − savingsMonthly
  (может быть < 0 — сигнал stress, не обрезается)

totalResources = currentBalance + incomeMonthly

availableForLife = MAX(0, totalResources − mandatoryMonthly − savingsMonthly − minimumBalance)

upcomingMandatoryFromBalance = MIN(currentBalance, mandatoryMonthly)

availableForPurchaseNow = MAX(0, currentBalance − minimumBalance − upcomingMandatoryFromBalance)

safeToSpendNow = availableForPurchaseNow  (v1 — совпадают)

balanceAfterMandatory = currentBalance − upcomingMandatoryFromBalance

projectedEndBalance = totalResources − mandatoryMonthly − savingsMonthly − availableForLife
  (≈ minimumBalance при корректной модели)

reserveProgress = minimumBalance > 0
  ? MIN(100, currentBalance / minimumBalance × 100)
  : (reserveTarget > 0 ? MIN(100, currentBalance / reserveTarget × 100) : 100)
```

**Важно:** если `reserveTarget` не задан явно, прогресс резерва считается от `minimumBalance`, а не от скрытого дефолта 100k.

### 5.4. Раздельные статусы (UI)

| Поле | Смысл |
|------|-------|
| `flowSafetyStatus` | Поток из дохода (`freeBudgetMonthly`) |
| `reserveSafetyStatus` | Запас на счёте (`reserveProgress` vs minimum) |
| `safetyStatus` | Худший из двух (legacy, для совместимости) |

### 5.3. Покупка с баланса — отдельная логика

```
missingAmount = MAX(0, price − availableForPurchaseNow)

monthsToPurchase = missing > 0 AND freeBudgetMonthly > 0
  ? CEIL(missing / freeBudgetMonthly)
  : null

reserveAfterPurchase = currentBalance − price
```

**Почему «на покупку» ≠ «на жизнь»:** с баланса сначала «бронируются» обязательные платежи и минимум, только остаток идёт на покупку **прямо сейчас**.

---

## 6. Статус бюджета

### 6.1. Поток из дохода (`flowSafetyStatus`)

| freeBudgetMonthly | Статус |
|-------------------|--------|
| ≥ 5 000 | healthy |
| 0..4 999 | caution |
| < 0 | danger |

### 6.2. Запас на счёте (`reserveSafetyStatus`)

| reserveProgress (от minimumBalance) | Статус |
|-------------------------------------|--------|
| ≥ 100% | healthy |
| 50..99% | caution |
| < 50% | danger |

Пороги в `constants.ts`: `THRESHOLD_CAUTION_FREE_BUDGET = 5000`, и т.д.

---

## 6A. Вкладка «Накопить» (`computeSavingsGoal`)

### Вход (SavingsGoalInput)
- `goalName`, `targetAmount`, `currentSaved`
- `deadlineMonths` (сценарий 1) или `monthlyContribution` (сценарий 2)
- `priority`, `canUseReserve`

### Формулы
```
remainingToSave = MAX(0, target - currentSaved)
requiredMonthly = deadlineMonths > 0 ? CEIL(remaining / deadlineMonths) : null
monthsToGoal = contribution > 0 ? CEIL(remaining / contribution) : null
progressPercent = MIN(100, currentSaved / target × 100)
safeContribution = MAX(0, freeBudgetMonthly)
effectiveContribution = monthlyContribution ?? requiredMonthly ?? safeContribution
```

### Дерево статусов
1. `currentSaved >= target` → achieved
2. `freeBudgetMonthly <= 0` → impossible
3. `effectiveContribution > freeBudgetMonthly` → warning
4. `canUseReserve && balance - contribution < minimum` → risk
5. `balance < minimum` → risk
6. иначе → ok

---

## 7. Распределение по категориям

**База:** `availableForLife` (не `freeBudgetMonthly`).

```
amount[i] = ROUND(availableForLife × percent[i] / totalPercent)
остаток от округления → категория «Прочее»
```

**Категории по умолчанию:**

| Категория | % |
|-----------|---|
| Продукты | 35 |
| Транспорт | 15 |
| Здоровье / аптека | 10 |
| Развлечения | 10 |
| Прочее | 30 |

---

## 8. Дерево решений о покупке (`decidePurchase`)

Приоритет **сверху вниз** — первое сработавшее правило:

```
1. canAffordFromBalance AND reserveAfterPurchase < minimumBalance
   → build_reserve («Сначала резерв»)

2. missingAmount > 0 AND freeBudgetMonthly ≤ 0
   → defer («Сначала стабилизируйте бюджет»)

3. missingAmount > 0 AND freeBudgetMonthly > 0
   → defer («Отложить на N месяцев»)

4. canAffordSafely AND freeBudgetMonthly < 0
   → defer (не «подождать 7 дней» при минусе!)

5. canAffordSafely AND urgency ≤ 2 AND usefulness ≤ 2
   → wait («Подождать 7 дней»)

6. canAffordSafely AND freeBudgetMonthly ≥ 0
   → buy_now («Купить сейчас»)

7. fallback → defer
```

### 8.1. Психологический слой
- `urgency` и `usefulness` по шкале 1–5
- При оценках ≤ 2 система советует подождать 7 дней (защита от импульса)
- При 3–5 решение только по финансам

### 8.2. Итоговые коды решений

| Код | UI | Когда |
|-----|-----|-------|
| `buy_now` | Купить сейчас | Хватает, резерв не пострадает, поток ≥ 0 |
| `wait` | Подождать 7 дней | Можно, но не срочно и не критично |
| `defer` | Отложить | Не хватает или отрицательный поток |
| `build_reserve` | Сначала резерв | На балансе хватает, но после покупки ниже minimum |

---

## 9. Примеры расчёта

### 9.1. Дефолтный сценарий (демо по умолчанию)

**Ввод:** доход 80k, счёт 45k, обязательное 40k, переменные 15k, копилка 10k, резерв 30k, покупка 35k

| Показатель | Значение |
|------------|----------|
| freeBudgetMonthly | 15 000 |
| availableForLife | 45 000 |
| availableForPurchaseNow | 0 |
| Решение | **Сначала резерв** (после покупки 10k < min 30k) |

### 9.2. Сценарий «большой счёт»

**Ввод:** доход 100k, счёт 100k, обязательное 50k, копилка 10k, резерв 15k, покупка 32k

| Показатель | Значение |
|------------|----------|
| freeBudgetMonthly | 40 000 |
| availableForLife | 125 000 |
| availableForPurchaseNow | 35 000 |
| Решение | **Купить сейчас** (32k ≤ 35k, после покупки 68k > 15k) |

---

## 10. UX калькулятора (`/app`)

### 10.1. Структура
- Общая форма бюджета (5 полей) сверху
- Вкладки: **Бюджет** | **Накопить**
- Бюджет: ответ + покупка; Накопить: цель + прогресс

### 10.2. Доступ
- `/app` и `/account` — только после login (Supabase)
- `/demo` → redirect на `/checkout`

---

## 11. Сайт и воронка

### 11.1. Страницы

| URL | Назначение |
|-----|------------|
| `/` | Лендинг, один CTA → checkout |
| `/checkout` | Оплата 399 ₽ |
| `/success` | «Проверьте почту — логин и пароль» |
| `/login` | Email + password |
| `/app` | Калькуляторы (protected) |
| `/account` | Файлы и ссылки (protected) |
| `/faq`, `/terms`, `/privacy` | Служебные |

### 11.2. User flow

```
Лендинг → /checkout → YooKassa → webhook → createUser + email → /login → /app + /account
```

### 11.3. Paywall + auth
- Supabase Auth (email + password)
- Webhook: `provisionUserAfterPayment()` + Resend email
- Файлы: `/api/downloads/[file]` (требует session)
- Env: см. `.env.example`

### 11.4. Технологии
- Next.js 15, TypeScript, Tailwind, shadcn/ui
- Vitest — unit-тесты на формулы (38+)
- YooKassa API (create + webhook)
- Supabase (profiles, auth) + Resend (email)
- Заказы dev: `data/orders.json`

## 12. Excel / Google Sheets

### 12.1. Листы (7+)
Старт, Доходы, Расходы, Распределение, Резерв, Решение о покупке, Цели, Дашборд

### 12.2. Синхронизация с кодом
- `scripts/finance-spec.mjs` — константы (синхрон с `constants.ts`)
- `scripts/generate-template.mjs` — генерация .xlsx
- Формулы на листе «Распределение» = `computeBudgetCore`, «Цели» = `computeSavingsGoal`

---

## 13. Монетизация

| Параметр | Значение |
|----------|----------|
| Цена | 399 ₽ |
| Модель | Разовая оплата |
| Платёжка | YooKassa |
| Доставка | Email (логин/пароль) + `/account` |

---

## 14. Статус реализации

### ✅ Готово
- Единое финансовое ядро + тесты (бюджет, покупка, накопления)
- Вкладки Бюджет | Накопить в `/app`
- Paywall: Supabase auth, middleware, protected downloads
- Webhook → createUser + Resend email
- Лендинг под конверсию, цена 399 ₽
- Excel лист «Цели»

### ⏳ TODO для продакшена
- Реальные ключи YooKassa, Supabase, Resend
- Google Sheets (загрузить шаблон, URL)
- PDF-инструкция
- Яндекс.Метрика
- БД заказов (Supabase)
- PDF-инструкция
- Яндекс.Метрика
- PWA / App Store (обсуждалось, не в MVP)

---

## 15. Ограничения и дисклеймеры

- Не финансовая / инвестиционная / налоговая консультация
- Рекомендации носят orientational характер
- Garbage in, garbage out — качество ответа = качество ввода

---

## 16. Шаблон ТЗ для масштабирования

При написании ТЗ на новый канал (бот, приложение, партнёрство) укажите:

1. **Канал** (Telegram-бот, iOS, embedded widget…)
2. **Какие 3 ответа** показываем (траты / статус / покупка)
3. **Какие поля ввода** (минимум 5 или расширенный набор)
4. **Источник формул** — только `computeFinance()`, без дублирования
5. **Язык и тон** — спокойный, «что / почему / следующий шаг»
6. **Монетизация** — paywall + разовая оплата 399 ₽
7. **Интеграции** — YooKassa, Supabase, Resend
8. **KPI** — конверсия landing→checkout, возвраты, NPS

---

## 17. Переменные окружения

| Переменная | Назначение |
|------------|------------|
| `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` | Оплата |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook: createUser |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Email с логином/паролем |
| `NEXT_PUBLIC_SITE_URL` | Return URLs, ссылки |
| `PRODUCT_PRICE` | 399 (default) |
| `PRODUCT_GOOGLE_SHEETS_URL` | Шаблон Sheets |

---

*Документ синхронизирован с кодом `src/lib/finance/` и UI `/app`.*
