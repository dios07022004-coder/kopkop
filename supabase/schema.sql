-- Supabase schema for «Деньги под контролем»
-- Run in Supabase SQL editor after creating the project

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  full_name text,
  yookassa_payment_id text unique,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  paid_at timestamptz,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  created_at timestamptz not null default now()
);

create index if not exists orders_email_idx on public.orders (email);
create index if not exists orders_payment_idx on public.orders (yookassa_payment_id);

alter table public.orders enable row level security;

-- Сохранённые расчёты пользователя (история, привязанная к аккаунту)
create table if not exists public.calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  free integer,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists calculations_user_idx on public.calculations (user_id, created_at desc);

alter table public.calculations enable row level security;

drop policy if exists "own calc select" on public.calculations;
create policy "own calc select" on public.calculations for select using (auth.uid() = user_id);

drop policy if exists "own calc insert" on public.calculations;
create policy "own calc insert" on public.calculations for insert with check (auth.uid() = user_id);

drop policy if exists "own calc delete" on public.calculations;
create policy "own calc delete" on public.calculations for delete using (auth.uid() = user_id);

-- Пользователи Telegram-бота (доступ только через service role)
create table if not exists public.telegram_users (
  tg_id bigint primary key,
  income integer not null default 0,
  mandatory integer not null default 0,
  savings integer not null default 0,
  step text,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Дневник трат + цель + напоминания (миграция, idempotent)
alter table public.telegram_users add column if not exists goal_name text;
alter table public.telegram_users add column if not exists goal_target integer not null default 0;
alter table public.telegram_users add column if not exists goal_saved integer not null default 0;
alter table public.telegram_users add column if not exists synced_at timestamptz;
alter table public.telegram_users add column if not exists remind_daily boolean not null default true;
alter table public.telegram_users add column if not exists last_remind_on date;

alter table public.telegram_users enable row level security;
-- политик нет → доступ только с service_role (бэкенд бота)

-- Единый леджер аккаунта: траты и разовые доходы (сайт + бот). День в МСК.
create table if not exists public.tg_expenses (
  id bigint generated always as identity primary key,
  tg_id bigint,
  user_id uuid references auth.users (id) on delete set null,
  amount integer not null,
  note text,
  day date not null,
  created_at timestamptz not null default now()
);

-- Миграция к леджеру (idempotent):
alter table public.tg_expenses alter column tg_id drop not null;
alter table public.tg_expenses add column if not exists kind text not null default 'expense';
alter table public.tg_expenses add column if not exists source text not null default 'tg';

create index if not exists tg_expenses_tg_day_idx on public.tg_expenses (tg_id, day);
create index if not exists tg_expenses_user_idx on public.tg_expenses (user_id, day);

alter table public.tg_expenses enable row level security;
-- доступ только с service_role (бэкенд бота / API сайта)

-- Одноразовые коды привязки Telegram к аккаунту сайта
create table if not exists public.tg_link_codes (
  code text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.tg_link_codes enable row level security;

create policy "Users can read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- Service role bypasses RLS for webhook provisioning
