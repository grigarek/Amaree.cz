-- DRAFT ONLY. DO NOT APPLY until checkout, RLS and transaction functions are reviewed.

alter table public.orders
  add column if not exists shipping_country text not null default 'CZ',
  add column if not exists packeta_point_id text,
  add column if not exists packeta_point_name text,
  add column if not exists packeta_point_type text check (packeta_point_type in ('pickup-point', 'zbox')),
  add column if not exists packeta_point_address jsonb,
  add column if not exists payment_provider text,
  add column if not exists payment_fee integer not null default 0 check (payment_fee >= 0),
  add column if not exists variable_symbol text,
  add column if not exists payment_due_at timestamptz,
  add column if not exists payment_received_at timestamptz,
  add column if not exists payment_confirmed_by uuid references auth.users(id),
  add column if not exists reservation_expires_at timestamptz;

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('pending_payment', 'awaiting_bank_transfer', 'confirmed_cod', 'paid', 'failed', 'cancelled', 'payment_expired', 'refunded'));

alter table public.orders drop constraint if exists orders_currency_check;
alter table public.orders add constraint orders_currency_check check (currency in ('CZK', 'EUR'));

create unique index if not exists orders_payment_provider_reference_unique
  on public.orders(payment_provider, payment_provider_reference)
  where payment_provider_reference is not null;

create unique index if not exists orders_variable_symbol_unique
  on public.orders(variable_symbol)
  where variable_symbol is not null;

create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  status text not null check (status in ('active', 'committed', 'released')),
  expires_at timestamptz,
  committed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index if not exists stock_reservations_active_idx
  on public.stock_reservations(product_id, expires_at)
  where status = 'active';

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  complaint_number text not null unique,
  order_id uuid references public.orders(id),
  customer_email text not null,
  defect_description text not null,
  requested_resolution text not null,
  status text not null default 'received',
  submitted_at timestamptz not null default now(),
  goods_received_at timestamptz,
  result text,
  resolved_at timestamptz,
  deadline_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- TODO before applying: implement reviewed SECURITY DEFINER transaction functions for
-- order creation/reservation, payment commit, expiry release and manual bank confirmation.
-- Each function must lock product/reservation rows and return without changing stock when
-- the reservation is already committed or released.
