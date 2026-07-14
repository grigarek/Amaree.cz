create extension if not exists "pgcrypto";

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name jsonb not null,
  short_description jsonb not null default '{}'::jsonb,
  long_description jsonb not null default '{}'::jsonb,
  category_id uuid not null references public.categories(id),
  price integer not null check (price >= 0),
  original_price integer check (original_price is null or original_price >= price),
  currency text not null default 'CZK' check (currency = 'CZK'),
  sku text not null unique,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  material jsonb not null default '{}'::jsonb,
  dimensions jsonb not null default '{}'::jsonb,
  care jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_email text not null,
  phone text,
  customer_name text not null,
  billing_address jsonb not null default '{}'::jsonb,
  shipping_address jsonb not null default '{}'::jsonb,
  shipping_method text not null,
  payment_method text not null,
  payment_status text not null default 'pending',
  fulfillment_status text not null default 'new',
  subtotal integer not null check (subtotal >= 0),
  shipping_price integer not null default 0 check (shipping_price >= 0),
  discount integer not null default 0 check (discount >= 0),
  total integer not null check (total >= 0),
  currency text not null default 'CZK' check (currency = 'CZK'),
  payment_provider_reference text,
  locale text not null default 'cs' check (locale in ('cs', 'en', 'de')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  sku text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total integer not null check (line_total >= 0)
);

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  value integer not null check (value > 0),
  minimum_order_value integer not null default 0 check (minimum_order_value >= 0),
  active boolean not null default true,
  valid_from timestamptz,
  valid_to timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  consent boolean not null default false,
  locale text not null default 'cs' check (locale in ('cs', 'en', 'de')),
  created_at timestamptz not null default now()
);

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  processed_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index products_category_id_idx on public.products(category_id);
create index products_active_idx on public.products(active);
create index product_images_product_id_idx on public.product_images(product_id);
create index orders_customer_email_idx on public.orders(customer_email);
create index orders_payment_status_idx on public.orders(payment_status);
create index order_items_order_id_idx on public.order_items(order_id);
create index discount_codes_active_idx on public.discount_codes(active);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.discount_codes enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.payment_webhook_events enable row level security;

create policy "Public can read active categories" on public.categories for select using (active = true);
create policy "Public can read active products" on public.products for select using (active = true);
create policy "Public can read product images" on public.product_images for select using (true);

create policy "Admins manage categories" on public.categories for all using (auth.jwt() ->> 'email' = any (string_to_array(current_setting('app.admin_emails', true), ',')));
create policy "Admins manage products" on public.products for all using (auth.jwt() ->> 'email' = any (string_to_array(current_setting('app.admin_emails', true), ',')));
create policy "Admins manage images" on public.product_images for all using (auth.jwt() ->> 'email' = any (string_to_array(current_setting('app.admin_emails', true), ',')));
create policy "Admins read orders" on public.orders for select using (auth.jwt() ->> 'email' = any (string_to_array(current_setting('app.admin_emails', true), ',')));
create policy "Admins read order items" on public.order_items for select using (auth.jwt() ->> 'email' = any (string_to_array(current_setting('app.admin_emails', true), ',')));
