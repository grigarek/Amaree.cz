-- AMAREE development baseline.
-- Reviewed for first use on an EMPTY development project only.
-- Do not apply to production without a separate approval and backup/restore test.

begin;

create extension if not exists "pgcrypto";

create type public.admin_role as enum ('admin', 'editor');
create type public.order_status as enum (
  'new',
  'awaiting_payment',
  'paid',
  'processing',
  'ready_for_pickup',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'archived'
);
create type public.payment_status as enum ('pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded');
create type public.reservation_status as enum ('active', 'committed', 'released', 'expired');
create type public.shipment_status as enum ('draft', 'creating', 'created', 'label_ready', 'shipped', 'delivered', 'cancelled');
create type public.email_status as enum ('queued', 'sent', 'failed', 'suppressed');
create type public.complaint_status as enum ('received', 'reviewing', 'accepted', 'rejected', 'resolved', 'closed');

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role public.admin_role not null default 'editor',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  success boolean not null,
  reason text,
  request_fingerprint text,
  created_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  internal_slug text not null unique check (internal_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.category_translations (
  category_id uuid not null references public.categories(id) on delete cascade,
  locale text not null check (locale in ('cs', 'en', 'de')),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  primary key (category_id, locale),
  unique (locale, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  internal_id text not null unique check (internal_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sku text not null unique check (sku ~ '^[A-Z0-9-]{3,64}$'),
  category_id uuid not null references public.categories(id),
  weight_grams numeric(10, 3) check (weight_grams is null or weight_grams > 0),
  active boolean not null default false,
  featured boolean not null default false,
  is_new boolean not null default false,
  sort_order integer not null default 0,
  low_stock_threshold integer not null default 2 check (low_stock_threshold >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not active or archived_at is null)
);

create table public.product_translations (
  product_id uuid not null references public.products(id) on delete cascade,
  locale text not null check (locale in ('cs', 'en', 'de')),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  short_description text not null,
  long_description text not null,
  material text not null,
  color text not null,
  dimensions text not null,
  care text not null,
  seo_title text not null,
  seo_description text not null,
  primary key (product_id, locale),
  unique (locale, slug)
);

create table public.product_prices (
  product_id uuid not null references public.products(id) on delete cascade,
  currency text not null check (currency in ('CZK', 'EUR')),
  amount_minor integer not null check (amount_minor >= 0),
  original_amount_minor integer check (original_amount_minor is null or original_amount_minor > amount_minor),
  primary key (product_id, currency)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  internal_id text not null,
  sku text not null unique check (sku ~ '^[A-Z0-9-]{3,64}$'),
  active boolean not null default true,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, internal_id),
  check (not active or archived_at is null)
);

create table public.product_variant_translations (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  locale text not null check (locale in ('cs', 'en', 'de')),
  name text not null,
  material text,
  color text,
  dimensions text,
  primary key (variant_id, locale)
);

create table public.product_variant_prices (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  currency text not null check (currency in ('CZK', 'EUR')),
  amount_minor integer not null check (amount_minor >= 0),
  original_amount_minor integer check (original_amount_minor is null or original_amount_minor > amount_minor),
  primary key (variant_id, currency)
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now()
);

create unique index inventory_product_without_variant_unique
  on public.inventory_items(product_id) where variant_id is null;
create unique index inventory_variant_unique
  on public.inventory_items(variant_id) where variant_id is not null;

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  inventory_item_id uuid not null references public.inventory_items(id),
  order_id uuid,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 12582912),
  width integer not null check (width >= 800 and width <= 12000),
  height integer not null check (height >= 800 and height <= 12000),
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index product_images_primary_unique
  on public.product_images(product_id) where is_primary and archived_at is null;
create unique index product_images_sort_unique
  on public.product_images(product_id, sort_order) where archived_at is null;

create table public.product_image_translations (
  image_id uuid not null references public.product_images(id) on delete cascade,
  locale text not null check (locale in ('cs', 'en', 'de')),
  alt_text text not null check (length(trim(alt_text)) > 0),
  primary key (image_id, locale)
);

create sequence public.order_number_sequence start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  idempotency_key uuid not null unique,
  status public.order_status not null default 'new',
  locale text not null default 'cs' check (locale in ('cs', 'en', 'de')),
  currency text not null check (currency in ('CZK', 'EUR')),
  customer_email text not null,
  customer_phone text,
  customer_first_name text not null,
  customer_last_name text not null,
  billing_address jsonb not null,
  shipping_address jsonb not null,
  shipping_country text not null check (shipping_country in ('CZ', 'SK')),
  customer_note text,
  internal_note text,
  shipping_method text not null,
  payment_method text not null check (payment_method in ('gopay', 'cash_on_delivery', 'bank_transfer')),
  subtotal_minor integer not null check (subtotal_minor >= 0),
  discount_minor integer not null default 0 check (discount_minor >= 0),
  shipping_minor integer not null default 0 check (shipping_minor >= 0),
  payment_fee_minor integer not null default 0 check (payment_fee_minor >= 0),
  total_minor integer not null check (total_minor >= 0),
  discount_code text,
  packeta_point_id text,
  packeta_point_name text,
  packeta_point_type text check (packeta_point_type in ('pickup-point', 'zbox')),
  packeta_point_address jsonb,
  reservation_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventory_movements
  add constraint inventory_movements_order_id_fkey foreign key (order_id) references public.orders(id) on delete set null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  sku text not null,
  name_snapshot jsonb not null,
  variant_snapshot jsonb,
  unit_price_minor integer not null check (unit_price_minor >= 0),
  quantity integer not null check (quantity > 0),
  line_total_minor integer not null check (line_total_minor = unit_price_minor * quantity)
);

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id),
  quantity integer not null check (quantity > 0),
  status public.reservation_status not null default 'active',
  expires_at timestamptz,
  committed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, inventory_item_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null check (provider in ('gopay', 'bank_transfer', 'cash_on_delivery')),
  provider_payment_id text,
  status public.payment_status not null default 'pending',
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null check (currency in ('CZK', 'EUR')),
  variable_symbol text,
  provider_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id),
  unique (variable_symbol)
);

create table public.payment_status_history (
  id bigint generated always as identity primary key,
  payment_id uuid not null references public.payments(id) on delete cascade,
  previous_status public.payment_status,
  new_status public.payment_status not null,
  source text not null,
  provider_event_id text,
  created_at timestamptz not null default now()
);

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payload_hash text not null,
  processed boolean not null default false,
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

create table public.packeta_points (
  id text primary key,
  country text not null check (country in ('CZ', 'SK')),
  name text not null,
  point_type text not null check (point_type in ('pickup-point', 'zbox')),
  address jsonb not null,
  carrier_id text,
  active boolean not null default true,
  provider_updated_at timestamptz,
  cached_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'packeta' check (provider = 'packeta'),
  status public.shipment_status not null default 'draft',
  provider_packet_id text,
  tracking_number text,
  tracking_url text,
  label_storage_path text,
  request_idempotency_key uuid not null default gen_random_uuid(),
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, provider),
  unique (provider, provider_packet_id),
  unique (request_idempotency_key)
);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  previous_status public.order_status,
  new_status public.order_status not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  note text,
  email_requested boolean not null default false,
  email_message_id uuid,
  created_at timestamptz not null default now()
);

create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  complaint_id uuid,
  template_key text not null,
  recipient text not null,
  locale text not null check (locale in ('cs', 'en', 'de')),
  subject text not null,
  body_text text not null,
  body_html text not null,
  provider text not null default 'ecomail',
  provider_message_id text,
  dedupe_key text not null unique,
  status public.email_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.order_status_history
  add constraint order_status_history_email_message_id_fkey foreign key (email_message_id) references public.email_messages(id) on delete set null;

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  value integer not null check (value > 0),
  currency text check (currency is null or currency in ('CZK', 'EUR')),
  minimum_order_minor integer not null default 0 check (minimum_order_minor >= 0),
  active boolean not null default true,
  valid_from timestamptz,
  valid_to timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_code_id uuid not null references public.discount_codes(id),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  amount_minor integer not null check (amount_minor >= 0),
  created_at timestamptz not null default now()
);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  complaint_number text not null unique,
  order_id uuid references public.orders(id) on delete set null,
  customer_email text not null,
  defect_description text not null,
  requested_resolution text not null,
  status public.complaint_status not null default 'received',
  result text,
  deadline_at timestamptz not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_messages
  add constraint email_messages_complaint_id_fkey foreign key (complaint_id) references public.complaints(id) on delete cascade;

create table public.complaint_status_history (
  id bigint generated always as identity primary key,
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  previous_status public.complaint_status,
  new_status public.complaint_status not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.shipping_options (
  code text not null,
  country text not null check (country in ('CZ', 'SK')),
  currency text not null check (currency in ('CZK', 'EUR')),
  name text not null,
  price_minor integer not null check (price_minor >= 0),
  free_from_minor integer check (free_from_minor is null or free_from_minor >= 0),
  active boolean not null default true,
  primary key (code, country, currency)
);

create table public.payment_options (
  code text not null check (code in ('gopay', 'cash_on_delivery', 'bank_transfer')),
  country text not null check (country in ('CZ', 'SK')),
  currency text not null check (currency in ('CZK', 'EUR')),
  fee_minor integer not null default 0 check (fee_minor >= 0),
  active boolean not null default true,
  primary key (code, country, currency)
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.is_admin_user(allowed_roles public.admin_role[] default array['admin'::public.admin_role, 'editor'::public.admin_role])
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
      and active = true
      and role = any(allowed_roles)
  );
$$;

revoke all on function public.is_admin_user(public.admin_role[]) from public;
grant execute on function public.is_admin_user(public.admin_role[]) to authenticated;

create function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  row_id text;
begin
  row_id := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id', to_jsonb(new)->>'product_id', to_jsonb(old)->>'product_id');
  insert into public.admin_audit_log(actor_user_id, action, entity_table, entity_id, old_values, new_values)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    row_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create function public.validate_inventory_variant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.variant_id is not null and not exists (
    select 1 from public.product_variants v
    where v.id = new.variant_id and v.product_id = new.product_id
  ) then
    raise exception 'inventory_variant_product_mismatch';
  end if;
  return new;
end;
$$;

create function public.record_initial_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.order_status_history(order_id, previous_status, new_status, note)
  values (new.id, null, new.status, 'Objednávka vytvořena');
  return new;
end;
$$;

create function public.admin_change_order_status(
  p_order_id uuid,
  p_new_status public.order_status,
  p_note text default null,
  p_email_requested boolean default false
)
returns public.order_status_history
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_status public.order_status;
  history_row public.order_status_history;
begin
  if not public.is_admin_user(array['admin'::public.admin_role]) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select status into current_status from public.orders where id = p_order_id for update;
  if current_status is null then raise exception 'order_not_found'; end if;
  if current_status = p_new_status then raise exception 'order_status_unchanged'; end if;

  update public.orders set status = p_new_status where id = p_order_id;
  insert into public.order_status_history(order_id, previous_status, new_status, actor_user_id, note, email_requested)
  values (p_order_id, current_status, p_new_status, auth.uid(), nullif(trim(p_note), ''), p_email_requested)
  returning * into history_row;
  return history_row;
end;
$$;

revoke all on function public.admin_change_order_status(uuid, public.order_status, text, boolean) from public;
grant execute on function public.admin_change_order_status(uuid, public.order_status, text, boolean) to authenticated;

create function public.admin_upsert_product(p_product_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_product_id uuid := coalesce(p_product_id, gen_random_uuid());
  target_category_id uuid;
  selected_locale text;
  translation jsonb;
  selected_currency text;
  price_data jsonb;
begin
  if not public.is_admin_user() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select id into target_category_id
  from public.categories
  where internal_slug = p_payload->>'category' and active;
  if target_category_id is null then raise exception 'category_not_found'; end if;

  insert into public.products(
    id, internal_id, sku, category_id, weight_grams, active, featured, is_new,
    sort_order, low_stock_threshold, archived_at
  ) values (
    target_product_id,
    p_payload->>'internalId',
    upper(p_payload->>'sku'),
    target_category_id,
    nullif(p_payload->>'weightGrams', '')::numeric,
    false,
    coalesce((p_payload->>'featured')::boolean, false),
    coalesce((p_payload->>'isNew')::boolean, false),
    coalesce((p_payload->>'sortOrder')::integer, 0),
    coalesce((p_payload->>'lowStockThreshold')::integer, 2),
    null
  )
  on conflict (id) do update set
    internal_id = excluded.internal_id,
    sku = excluded.sku,
    category_id = excluded.category_id,
    weight_grams = excluded.weight_grams,
    active = public.products.active,
    featured = excluded.featured,
    is_new = excluded.is_new,
    sort_order = excluded.sort_order,
    low_stock_threshold = excluded.low_stock_threshold,
    archived_at = null;

  foreach selected_locale in array array['cs', 'en', 'de'] loop
    translation := p_payload->'translations'->selected_locale;
    insert into public.product_translations(
      product_id, locale, slug, name, short_description, long_description,
      material, color, dimensions, care, seo_title, seo_description
    ) values (
      target_product_id, selected_locale, translation->>'slug', translation->>'name',
      translation->>'shortDescription', translation->>'longDescription',
      translation->>'material', translation->>'color', translation->>'dimensions',
      translation->>'care', translation->>'seoTitle', translation->>'seoDescription'
    )
    on conflict (product_id, locale) do update set
      slug = excluded.slug,
      name = excluded.name,
      short_description = excluded.short_description,
      long_description = excluded.long_description,
      material = excluded.material,
      color = excluded.color,
      dimensions = excluded.dimensions,
      care = excluded.care,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description;
  end loop;

  foreach selected_currency in array array['CZK', 'EUR'] loop
    price_data := p_payload->'prices'->selected_currency;
    insert into public.product_prices(product_id, currency, amount_minor, original_amount_minor)
    values (
      target_product_id,
      selected_currency,
      (price_data->>'amountMinor')::integer,
      nullif(price_data->>'originalAmountMinor', '')::integer
    )
    on conflict (product_id, currency) do update set
      amount_minor = excluded.amount_minor,
      original_amount_minor = excluded.original_amount_minor;
  end loop;

  insert into public.inventory_items(product_id, variant_id, quantity)
  values (target_product_id, null, (p_payload->>'stockQuantity')::integer)
  on conflict (product_id) where variant_id is null do update set quantity = excluded.quantity;

  return target_product_id;
end;
$$;

revoke all on function public.admin_upsert_product(uuid, jsonb) from public;
grant execute on function public.admin_upsert_product(uuid, jsonb) to authenticated;

create function public.admin_set_product_active(p_product_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin_user() then raise exception 'admin_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.products where id = p_product_id) then raise exception 'product_not_found'; end if;

  if p_active then
    if (select count(*) from public.product_translations where product_id = p_product_id) <> 3 then
      raise exception 'product_translations_incomplete';
    end if;
    if (select count(*) from public.product_prices where product_id = p_product_id and amount_minor > 0) <> 2 then
      raise exception 'product_prices_incomplete';
    end if;
    if not exists (select 1 from public.inventory_items where product_id = p_product_id and variant_id is null) then
      raise exception 'product_inventory_missing';
    end if;
    if not exists (
      select 1 from public.product_images i
      where i.product_id = p_product_id and i.is_primary and i.archived_at is null
        and (select count(*) from public.product_image_translations t where t.image_id = i.id and length(trim(t.alt_text)) > 0) = 3
    ) then
      raise exception 'product_primary_image_incomplete';
    end if;
  end if;

  update public.products
  set active = p_active, archived_at = case when p_active then null else archived_at end
  where id = p_product_id;
end;
$$;

revoke all on function public.admin_set_product_active(uuid, boolean) from public;
grant execute on function public.admin_set_product_active(uuid, boolean) to authenticated;

create function public.admin_reorder_product_images(p_product_id uuid, p_image_ids uuid[], p_primary_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  image_id uuid;
  position integer := 0;
begin
  if not public.is_admin_user() then raise exception 'admin_required' using errcode = '42501'; end if;
  if array_length(p_image_ids, 1) is null then raise exception 'image_order_empty'; end if;
  if not p_primary_id = any(p_image_ids) then raise exception 'primary_image_missing_from_order'; end if;
  if (select count(*) from public.product_images where product_id = p_product_id and archived_at is null and id = any(p_image_ids)) <> array_length(p_image_ids, 1) then
    raise exception 'image_order_invalid';
  end if;

  update public.product_images set is_primary = false, sort_order = sort_order + 100000 where product_id = p_product_id and archived_at is null;
  foreach image_id in array p_image_ids loop
    update public.product_images set sort_order = position, is_primary = image_id = p_primary_id where id = image_id and product_id = p_product_id;
    position := position + 1;
  end loop;
end;
$$;

revoke all on function public.admin_reorder_product_images(uuid, uuid[], uuid) from public;
grant execute on function public.admin_reorder_product_images(uuid, uuid[], uuid) to authenticated;

create function public.reserve_order_stock(p_order_id uuid, p_expires_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  line record;
  available integer;
begin
  for line in
    select oi.inventory_item_id, sum(oi.quantity)::integer as quantity
    from public.order_items oi where oi.order_id = p_order_id
    group by oi.inventory_item_id
  loop
    perform 1 from public.inventory_items where id = line.inventory_item_id for update;
    select i.quantity - coalesce(sum(r.quantity) filter (where r.status = 'active' and (r.expires_at is null or r.expires_at > now())), 0)
      into available
      from public.inventory_items i
      left join public.stock_reservations r on r.inventory_item_id = i.id
      where i.id = line.inventory_item_id
      group by i.quantity;
    if available < line.quantity then raise exception 'insufficient_stock'; end if;

    insert into public.stock_reservations(order_id, inventory_item_id, quantity, status, expires_at)
    values (p_order_id, line.inventory_item_id, line.quantity, 'active', p_expires_at)
    on conflict (order_id, inventory_item_id) do nothing;
  end loop;
  update public.orders set reservation_expires_at = p_expires_at where id = p_order_id;
end;
$$;

create function public.commit_order_stock(p_order_id uuid, p_reason text default 'order_paid')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation record;
begin
  for reservation in
    select * from public.stock_reservations where order_id = p_order_id and status = 'active' order by inventory_item_id for update
  loop
    update public.inventory_items
      set quantity = quantity - reservation.quantity
      where id = reservation.inventory_item_id and quantity >= reservation.quantity;
    if not found then raise exception 'insufficient_stock_on_commit'; end if;
    insert into public.inventory_movements(inventory_item_id, order_id, quantity_delta, reason)
      values (reservation.inventory_item_id, p_order_id, -reservation.quantity, p_reason);
    update public.stock_reservations set status = 'committed', committed_at = now() where id = reservation.id;
  end loop;
end;
$$;

create function public.release_order_stock(p_order_id uuid, p_expired boolean default false)
returns void
language sql
security definer
set search_path = public
as $$
  update public.stock_reservations
  set status = case when p_expired then 'expired'::public.reservation_status else 'released'::public.reservation_status end,
      released_at = now()
  where order_id = p_order_id and status = 'active';
$$;

create function public.expire_due_stock_reservations(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders;
  expired_count integer := 0;
begin
  if p_limit < 1 or p_limit > 500 then
    raise exception 'invalid_expiry_limit';
  end if;

  for target_order in
    select o.*
    from public.orders o
    where o.status in ('new', 'awaiting_payment')
      and o.reservation_expires_at is not null
      and o.reservation_expires_at <= now()
      and exists (
        select 1 from public.stock_reservations r
        where r.order_id = o.id and r.status = 'active'
      )
    order by o.reservation_expires_at
    for update skip locked
    limit p_limit
  loop
    perform public.release_order_stock(target_order.id, true);

    insert into public.payment_status_history(payment_id, previous_status, new_status, source)
    select id, status, 'expired', 'reservation_expiry'
    from public.payments
    where order_id = target_order.id and status = 'pending';

    update public.payments
    set status = 'expired'
    where order_id = target_order.id and status = 'pending';

    update public.orders set status = 'cancelled' where id = target_order.id;
    insert into public.order_status_history(order_id, previous_status, new_status, note)
    values (target_order.id, target_order.status, 'cancelled', 'Automatické uvolnění expirované skladové rezervace');

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

revoke all on function public.expire_due_stock_reservations(integer) from public, anon, authenticated;
grant execute on function public.expire_due_stock_reservations(integer) to service_role;

create function public.get_project_usage()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, storage
as $$
  select jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((metadata ->> 'size')::bigint) from storage.objects), 0),
    'storage_objects', (select count(*) from storage.objects),
    'products', (select count(*) from public.products),
    'orders', (select count(*) from public.orders)
  );
$$;

revoke all on function public.get_project_usage() from public, anon, authenticated;
grant execute on function public.get_project_usage() to service_role;

create function public.create_checkout_order(p_idempotency_key uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_order public.orders;
  target_order_id uuid := gen_random_uuid();
  target_order_number text;
  target_currency text;
  target_status public.order_status;
  line_data jsonb;
  product_data record;
  subtotal_value integer := 0;
  discount_value integer := 0;
  shipping_value integer := 0;
  payment_fee_value integer := 0;
  total_value integer := 0;
  shipping_option public.shipping_options;
  payment_option public.payment_options;
  discount_row public.discount_codes;
  expires_at_value timestamptz;
  payment_row_id uuid;
begin
  select * into existing_order from public.orders where idempotency_key = p_idempotency_key;
  if found then
    select id into payment_row_id from public.payments where order_id = existing_order.id order by created_at limit 1;
    return jsonb_build_object(
      'orderId', existing_order.id, 'orderNumber', existing_order.order_number,
      'paymentId', payment_row_id, 'status', existing_order.status,
      'currency', existing_order.currency, 'subtotal', existing_order.subtotal_minor,
      'discount', existing_order.discount_minor, 'shipping', existing_order.shipping_minor,
      'paymentFee', existing_order.payment_fee_minor, 'total', existing_order.total_minor,
      'duplicate', true
    );
  end if;

  if jsonb_typeof(p_payload->'lines') <> 'array' or jsonb_array_length(p_payload->'lines') = 0 then
    raise exception 'checkout_lines_required';
  end if;
  if p_payload->>'countryCode' not in ('CZ', 'SK') then raise exception 'checkout_country_invalid'; end if;
  target_currency := case when p_payload->>'countryCode' = 'CZ' then 'CZK' else 'EUR' end;

  select * into shipping_option from public.shipping_options
  where code = p_payload->>'shippingMethodId' and country = p_payload->>'countryCode'
    and currency = target_currency and active;
  if not found then raise exception 'shipping_option_unavailable'; end if;
  select * into payment_option from public.payment_options
  where code = p_payload->>'paymentMethodId' and country = p_payload->>'countryCode'
    and currency = target_currency and active;
  if not found then raise exception 'payment_option_unavailable'; end if;

  for line_data in select value from jsonb_array_elements(p_payload->'lines') loop
    if coalesce((line_data->>'quantity')::integer, 0) <= 0 then raise exception 'checkout_quantity_invalid'; end if;
    select p.id, pp.amount_minor, i.id as inventory_item_id
      into product_data
      from public.products p
      join public.product_prices pp on pp.product_id = p.id and pp.currency = target_currency
      join public.inventory_items i on i.product_id = p.id and i.variant_id is null
      where p.id = (line_data->>'productId')::uuid and p.active and p.archived_at is null;
    if not found then raise exception 'checkout_product_unavailable'; end if;
    subtotal_value := subtotal_value + product_data.amount_minor * (line_data->>'quantity')::integer;
  end loop;

  if nullif(upper(trim(p_payload->>'discountCode')), '') is not null then
    select * into discount_row from public.discount_codes
    where code = upper(trim(p_payload->>'discountCode')) and active
      and (currency is null or currency = target_currency)
      and (valid_from is null or valid_from <= now())
      and (valid_to is null or valid_to >= now())
      and (usage_limit is null or usage_count < usage_limit)
      and subtotal_value >= minimum_order_minor
    for update;
    if found then
      discount_value := case when discount_row.discount_type = 'percent'
        then floor(subtotal_value * discount_row.value / 100.0)::integer
        else least(discount_row.value, subtotal_value) end;
    end if;
  end if;

  shipping_value := case
    when shipping_option.free_from_minor is not null and subtotal_value - discount_value >= shipping_option.free_from_minor then 0
    else shipping_option.price_minor end;
  payment_fee_value := payment_option.fee_minor;
  total_value := greatest(subtotal_value - discount_value + shipping_value + payment_fee_value, 0);
  target_order_number := 'A' || to_char(now(), 'YY') || '-' || lpad(nextval('public.order_number_sequence')::text, 4, '0');
  target_status := case when p_payload->>'paymentMethodId' in ('gopay', 'bank_transfer') then 'awaiting_payment'::public.order_status else 'new'::public.order_status end;
  expires_at_value := case p_payload->>'paymentMethodId'
    when 'gopay' then now() + interval '30 minutes'
    when 'bank_transfer' then now() + interval '3 days'
    else null end;

  insert into public.orders(
    id, order_number, idempotency_key, status, locale, currency, customer_email, customer_phone,
    customer_first_name, customer_last_name, billing_address, shipping_address, shipping_country,
    customer_note, shipping_method, payment_method, subtotal_minor, discount_minor, shipping_minor,
    payment_fee_minor, total_minor, discount_code, packeta_point_id, packeta_point_name,
    packeta_point_type, packeta_point_address, reservation_expires_at
  ) values (
    target_order_id, target_order_number, p_idempotency_key, target_status,
    coalesce(p_payload->>'locale', 'cs'), target_currency, lower(trim(p_payload->>'email')),
    nullif(trim(p_payload->>'phone'), ''), p_payload->>'firstName', p_payload->>'lastName',
    coalesce(p_payload->'billingAddress', p_payload->'shippingAddress', '{}'::jsonb),
    coalesce(p_payload->'shippingAddress', '{}'::jsonb), p_payload->>'countryCode',
    nullif(trim(p_payload->>'customerNote'), ''), p_payload->>'shippingMethodId', p_payload->>'paymentMethodId',
    subtotal_value, discount_value, shipping_value, payment_fee_value, total_value,
    case when discount_row.id is not null then discount_row.code else null end,
    nullif(p_payload->'packetaPoint'->>'id', ''), nullif(p_payload->'packetaPoint'->>'name', ''),
    nullif(p_payload->'packetaPoint'->>'type', ''), p_payload->'packetaPoint', expires_at_value
  );

  for line_data in select value from jsonb_array_elements(p_payload->'lines') loop
    select p.id, p.sku, pp.amount_minor, i.id as inventory_item_id,
      (select jsonb_object_agg(t.locale, t.name) from public.product_translations t where t.product_id = p.id) as names
      into product_data
      from public.products p
      join public.product_prices pp on pp.product_id = p.id and pp.currency = target_currency
      join public.inventory_items i on i.product_id = p.id and i.variant_id is null
      where p.id = (line_data->>'productId')::uuid and p.active and p.archived_at is null;
    insert into public.order_items(order_id, product_id, inventory_item_id, sku, name_snapshot, unit_price_minor, quantity, line_total_minor)
    values (target_order_id, product_data.id, product_data.inventory_item_id, product_data.sku, product_data.names,
      product_data.amount_minor, (line_data->>'quantity')::integer,
      product_data.amount_minor * (line_data->>'quantity')::integer);
  end loop;

  perform public.reserve_order_stock(target_order_id, expires_at_value);
  if p_payload->>'paymentMethodId' = 'cash_on_delivery' then
    perform public.commit_order_stock(target_order_id, 'cash_on_delivery_order');
  end if;

  insert into public.payments(order_id, provider, status, amount_minor, currency, variable_symbol)
  values (
    target_order_id, p_payload->>'paymentMethodId', 'pending', total_value, target_currency,
    case when p_payload->>'paymentMethodId' = 'bank_transfer' then regexp_replace(target_order_number, '\D', '', 'g') else null end
  ) returning id into payment_row_id;
  insert into public.payment_status_history(payment_id, previous_status, new_status, source)
  values (payment_row_id, null, 'pending', 'checkout');

  if discount_row.id is not null then
    insert into public.discount_redemptions(discount_code_id, order_id, amount_minor)
    values (discount_row.id, target_order_id, discount_value);
    update public.discount_codes set usage_count = usage_count + 1 where id = discount_row.id;
  end if;

  return jsonb_build_object(
    'orderId', target_order_id, 'orderNumber', target_order_number, 'paymentId', payment_row_id,
    'status', target_status, 'currency', target_currency, 'subtotal', subtotal_value,
    'discount', discount_value, 'shipping', shipping_value, 'paymentFee', payment_fee_value,
    'total', total_value, 'duplicate', false
  );
end;
$$;

create function public.process_gopay_payment_status(
  p_provider_payment_id text,
  p_new_status public.payment_status,
  p_event_id text,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_payment public.payments;
  target_order public.orders;
  next_order_status public.order_status;
begin
  insert into public.payment_webhook_events(provider, event_id, payload_hash)
  values ('gopay', p_event_id, p_payload_hash)
  on conflict (provider, event_id) do nothing;
  if not found then return jsonb_build_object('duplicate', true); end if;

  select * into target_payment from public.payments
  where provider = 'gopay' and provider_payment_id = p_provider_payment_id for update;
  if not found then
    update public.payment_webhook_events set processing_error = 'payment_not_found' where provider = 'gopay' and event_id = p_event_id;
    raise exception 'payment_not_found';
  end if;
  select * into target_order from public.orders where id = target_payment.order_id for update;

  if target_payment.status <> p_new_status then
    update public.payments set status = p_new_status,
      paid_at = case when p_new_status = 'paid' then coalesce(paid_at, now()) else paid_at end
    where id = target_payment.id;
    insert into public.payment_status_history(payment_id, previous_status, new_status, source, provider_event_id)
    values (target_payment.id, target_payment.status, p_new_status, 'gopay_notification', p_event_id);

    if p_new_status = 'paid' then
      perform public.commit_order_stock(target_order.id, 'gopay_paid');
      next_order_status := 'paid';
    elsif p_new_status in ('cancelled', 'expired') then
      perform public.release_order_stock(target_order.id, p_new_status = 'expired');
      next_order_status := 'cancelled';
    elsif p_new_status = 'refunded' then
      next_order_status := 'refunded';
    else
      next_order_status := target_order.status;
    end if;

    if next_order_status <> target_order.status then
      update public.orders set status = next_order_status where id = target_order.id;
      insert into public.order_status_history(order_id, previous_status, new_status, note)
      values (target_order.id, target_order.status, next_order_status, 'Automatická změna podle ověřeného stavu GoPay');
    end if;
  end if;

  update public.payment_webhook_events set processed = true, processed_at = now(), processing_error = null
  where provider = 'gopay' and event_id = p_event_id;
  return jsonb_build_object('duplicate', false, 'orderId', target_order.id, 'paymentId', target_payment.id, 'status', p_new_status);
end;
$$;

create function public.claim_gopay_payment_creation(p_payment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean := false;
begin
  update public.payments
  set provider_payload = provider_payload || jsonb_build_object('creation_claimed_at', now())
  where id = p_payment_id and provider = 'gopay' and provider_payment_id is null
    and (
      provider_payload->>'creation_claimed_at' is null
      or (provider_payload->>'creation_claimed_at')::timestamptz < now() - interval '5 minutes'
    );
  claimed := found;
  return claimed;
end;
$$;

create function public.admin_claim_packeta_shipment(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  shipment_row public.shipments;
begin
  if not public.is_admin_user(array['admin'::public.admin_role]) then raise exception 'admin_required' using errcode = '42501'; end if;
  insert into public.shipments(order_id, status) values (p_order_id, 'creating')
  on conflict (order_id, provider) do nothing
  returning * into shipment_row;
  if found then return jsonb_build_object('claimed', true, 'shipmentId', shipment_row.id); end if;

  select * into shipment_row from public.shipments where order_id = p_order_id and provider = 'packeta' for update;
  if shipment_row.provider_packet_id is not null or shipment_row.status = 'creating' then
    return jsonb_build_object('claimed', false, 'shipmentId', shipment_row.id, 'status', shipment_row.status, 'providerPacketId', shipment_row.provider_packet_id);
  end if;
  update public.shipments set status = 'creating' where id = shipment_row.id;
  return jsonb_build_object('claimed', true, 'shipmentId', shipment_row.id);
end;
$$;

create function public.admin_mark_order_shipped(p_order_id uuid, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  order_row public.orders;
  shipment_row public.shipments;
begin
  if not public.is_admin_user(array['admin'::public.admin_role]) then raise exception 'admin_required' using errcode = '42501'; end if;
  select * into order_row from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  select * into shipment_row from public.shipments where order_id = p_order_id and provider = 'packeta' for update;
  if not found or shipment_row.provider_packet_id is null or shipment_row.tracking_number is null then
    raise exception 'packeta_shipment_incomplete';
  end if;
  if order_row.status = 'shipped' and shipment_row.status = 'shipped' then return false; end if;
  update public.shipments set status = 'shipped' where id = shipment_row.id;
  if order_row.status <> 'shipped' then
    update public.orders set status = 'shipped' where id = p_order_id;
    insert into public.order_status_history(order_id, previous_status, new_status, actor_user_id, note, email_requested)
    values (p_order_id, order_row.status, 'shipped', auth.uid(), nullif(trim(p_note), ''), false);
  end if;
  return true;
end;
$$;

revoke all on function public.reserve_order_stock(uuid, timestamptz) from public;
revoke all on function public.commit_order_stock(uuid, text) from public;
revoke all on function public.release_order_stock(uuid, boolean) from public;
revoke all on function public.create_checkout_order(uuid, jsonb) from public;
revoke all on function public.process_gopay_payment_status(text, public.payment_status, text, text) from public;
revoke all on function public.claim_gopay_payment_creation(uuid) from public;
revoke all on function public.admin_claim_packeta_shipment(uuid) from public;
revoke all on function public.admin_mark_order_shipped(uuid, text) from public;
grant execute on function public.reserve_order_stock(uuid, timestamptz) to service_role;
grant execute on function public.commit_order_stock(uuid, text) to service_role;
grant execute on function public.release_order_stock(uuid, boolean) to service_role;
grant execute on function public.create_checkout_order(uuid, jsonb) to service_role;
grant execute on function public.process_gopay_payment_status(text, public.payment_status, text, text) to service_role;
grant execute on function public.claim_gopay_payment_creation(uuid) to service_role;
grant execute on function public.admin_claim_packeta_shipment(uuid) to authenticated;
grant execute on function public.admin_mark_order_shipped(uuid, text) to authenticated;

create trigger orders_initial_status after insert on public.orders for each row execute function public.record_initial_order_status();

create trigger admin_users_updated_at before update on public.admin_users for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_variants_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
create trigger inventory_items_updated_at before update on public.inventory_items for each row execute function public.set_updated_at();
create trigger inventory_items_validate_variant before insert or update on public.inventory_items for each row execute function public.validate_inventory_variant();
create trigger product_images_updated_at before update on public.product_images for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger shipments_updated_at before update on public.shipments for each row execute function public.set_updated_at();
create trigger discount_codes_updated_at before update on public.discount_codes for each row execute function public.set_updated_at();
create trigger complaints_updated_at before update on public.complaints for each row execute function public.set_updated_at();

create trigger audit_categories after insert or update or delete on public.categories for each row execute function public.audit_admin_change();
create trigger audit_category_translations after insert or update or delete on public.category_translations for each row execute function public.audit_admin_change();
create trigger audit_products after insert or update or delete on public.products for each row execute function public.audit_admin_change();
create trigger audit_product_translations after insert or update or delete on public.product_translations for each row execute function public.audit_admin_change();
create trigger audit_product_prices after insert or update or delete on public.product_prices for each row execute function public.audit_admin_change();
create trigger audit_product_variants after insert or update or delete on public.product_variants for each row execute function public.audit_admin_change();
create trigger audit_inventory after insert or update or delete on public.inventory_items for each row execute function public.audit_admin_change();
create trigger audit_product_images after insert or update or delete on public.product_images for each row execute function public.audit_admin_change();
create trigger audit_orders after insert or update or delete on public.orders for each row execute function public.audit_admin_change();
create trigger audit_shipments after insert or update or delete on public.shipments for each row execute function public.audit_admin_change();
create trigger audit_complaints after insert or update or delete on public.complaints for each row execute function public.audit_admin_change();

create index products_category_idx on public.products(category_id, active, sort_order);
create index product_translations_slug_idx on public.product_translations(locale, slug);
create index product_images_product_idx on public.product_images(product_id, sort_order);
create index orders_status_created_idx on public.orders(status, created_at desc);
create index orders_customer_email_idx on public.orders(customer_email);
create index order_items_order_idx on public.order_items(order_id);
create index reservations_active_idx on public.stock_reservations(inventory_item_id, expires_at) where status = 'active';
create index payment_history_payment_idx on public.payment_status_history(payment_id, created_at);
create index order_history_order_idx on public.order_status_history(order_id, created_at);
create index emails_order_idx on public.email_messages(order_id, created_at);
create index audit_entity_idx on public.admin_audit_log(entity_table, entity_id, created_at desc);

alter table public.admin_users enable row level security;
alter table public.admin_login_events enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.categories enable row level security;
alter table public.category_translations enable row level security;
alter table public.products enable row level security;
alter table public.product_translations enable row level security;
alter table public.product_prices enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_variant_translations enable row level security;
alter table public.product_variant_prices enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.product_images enable row level security;
alter table public.product_image_translations enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.payments enable row level security;
alter table public.payment_status_history enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.packeta_points enable row level security;
alter table public.shipments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.email_messages enable row level security;
alter table public.discount_codes enable row level security;
alter table public.discount_redemptions enable row level security;
alter table public.complaints enable row level security;
alter table public.complaint_status_history enable row level security;
alter table public.shipping_options enable row level security;
alter table public.payment_options enable row level security;

create policy public_categories_read on public.categories for select using (active);
create policy public_category_translations_read on public.category_translations for select using (
  exists (select 1 from public.categories c where c.id = category_id and c.active)
);
create policy public_products_read on public.products for select using (active and archived_at is null);
create policy public_product_translations_read on public.product_translations for select using (
  exists (select 1 from public.products p where p.id = product_id and p.active and p.archived_at is null)
);
create policy public_product_prices_read on public.product_prices for select using (
  exists (select 1 from public.products p where p.id = product_id and p.active and p.archived_at is null)
);
create policy public_variants_read on public.product_variants for select using (
  active and archived_at is null and exists (select 1 from public.products p where p.id = product_id and p.active and p.archived_at is null)
);
create policy public_variant_translations_read on public.product_variant_translations for select using (
  exists (select 1 from public.product_variants v join public.products p on p.id = v.product_id where v.id = variant_id and v.active and p.active)
);
create policy public_variant_prices_read on public.product_variant_prices for select using (
  exists (select 1 from public.product_variants v join public.products p on p.id = v.product_id where v.id = variant_id and v.active and p.active)
);
create policy public_inventory_read on public.inventory_items for select using (
  exists (select 1 from public.products p where p.id = product_id and p.active and p.archived_at is null)
);
create policy public_product_images_read on public.product_images for select using (
  archived_at is null and exists (select 1 from public.products p where p.id = product_id and p.active and p.archived_at is null)
);
create policy public_image_translations_read on public.product_image_translations for select using (
  exists (select 1 from public.product_images i join public.products p on p.id = i.product_id where i.id = image_id and i.archived_at is null and p.active)
);
create policy public_shipping_options_read on public.shipping_options for select using (active);
create policy public_payment_options_read on public.payment_options for select using (active);

create policy admin_users_self_read on public.admin_users for select using (user_id = auth.uid() and active);
create policy admins_manage_admin_users on public.admin_users for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_read_login_events on public.admin_login_events for select using (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_read_audit on public.admin_audit_log for select using (public.is_admin_user(array['admin'::public.admin_role]));

create policy catalog_admin_categories on public.categories for all using (public.is_admin_user()) with check (public.is_admin_user());
create policy catalog_admin_category_translations on public.category_translations for all using (public.is_admin_user()) with check (public.is_admin_user());
create policy catalog_admin_products on public.products for all using (public.is_admin_user()) with check (public.is_admin_user());
create policy catalog_admin_product_translations on public.product_translations for all using (public.is_admin_user()) with check (public.is_admin_user());
create policy catalog_admin_product_prices on public.product_prices for all using (public.is_admin_user()) with check (public.is_admin_user());
create policy catalog_admin_variants on public.product_variants for all using (public.is_admin_user()) with check (public.is_admin_user());
create policy catalog_admin_variant_translations on public.product_variant_translations for all using (public.is_admin_user()) with check (public.is_admin_user());
create policy catalog_admin_variant_prices on public.product_variant_prices for all using (public.is_admin_user()) with check (public.is_admin_user());
create policy catalog_admin_inventory on public.inventory_items for all using (public.is_admin_user()) with check (public.is_admin_user());
create policy catalog_admin_inventory_movements on public.inventory_movements for all using (public.is_admin_user()) with check (public.is_admin_user());
create policy catalog_admin_images on public.product_images for all using (public.is_admin_user()) with check (public.is_admin_user());
create policy catalog_admin_image_translations on public.product_image_translations for all using (public.is_admin_user()) with check (public.is_admin_user());

create policy admins_manage_orders on public.orders for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_order_items on public.order_items for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_reservations on public.stock_reservations for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_payments on public.payments for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_payment_history on public.payment_status_history for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_webhooks on public.payment_webhook_events for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_packeta_points on public.packeta_points for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_shipments on public.shipments for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_order_history on public.order_status_history for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_emails on public.email_messages for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_discounts on public.discount_codes for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_redemptions on public.discount_redemptions for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_complaints on public.complaints for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_complaint_history on public.complaint_status_history for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_shipping_options on public.shipping_options for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_payment_options on public.payment_options for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 12582912, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_storage_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin_user());
create policy product_images_storage_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin_user())
  with check (bucket_id = 'product-images' and public.is_admin_user());
create policy product_images_storage_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin_user());

insert into public.categories(internal_slug, sort_order) values
  ('necklaces', 10), ('earrings', 20), ('bracelets', 30);

insert into public.category_translations(category_id, locale, slug, name, description)
select c.id, values.locale, values.slug, values.name, values.description
from public.categories c
join (values
  ('necklaces', 'cs', 'nahrdelniky', 'Náhrdelníky', 'Nadčasové linie pro každý den.'),
  ('necklaces', 'en', 'necklaces', 'Necklaces', 'Timeless lines for every day.'),
  ('necklaces', 'de', 'halsketten', 'Halsketten', 'Zeitlose Linien für jeden Tag.'),
  ('earrings', 'cs', 'nausnice', 'Náušnice', 'Jemné náušnice pro každodenní eleganci.'),
  ('earrings', 'en', 'earrings', 'Earrings', 'Delicate earrings for everyday elegance.'),
  ('earrings', 'de', 'ohrringe', 'Ohrringe', 'Feine Ohrringe für den Alltag.'),
  ('bracelets', 'cs', 'naramky', 'Náramky', 'Minimalistické náramky pro vrstvení.'),
  ('bracelets', 'en', 'bracelets', 'Bracelets', 'Minimal bracelets made for layering.'),
  ('bracelets', 'de', 'armbaender', 'Armbänder', 'Minimalistische Armbänder zum Kombinieren.')
) as values(internal_slug, locale, slug, name, description)
on values.internal_slug = c.internal_slug;

insert into public.shipping_options(code, country, currency, name, price_minor, free_from_minor) values
  ('packeta_pickup', 'CZ', 'CZK', 'Packeta – výdejní místo nebo Z-BOX', 9500, 150000),
  ('packeta_home', 'CZ', 'CZK', 'Packeta – doručení na adresu', 11900, 150000),
  ('personal_pickup', 'CZ', 'CZK', 'Osobní odběr', 0, 0),
  ('packeta_pickup', 'SK', 'EUR', 'Packeta – výdajné miesto alebo Z-BOX', 390, null),
  ('packeta_home', 'SK', 'EUR', 'Packeta – doručenie na adresu', 490, null);

insert into public.payment_options(code, country, currency, fee_minor) values
  ('gopay', 'CZ', 'CZK', 0), ('cash_on_delivery', 'CZ', 'CZK', 3900), ('bank_transfer', 'CZ', 'CZK', 0),
  ('gopay', 'SK', 'EUR', 0), ('cash_on_delivery', 'SK', 'EUR', 190), ('bank_transfer', 'SK', 'EUR', 0);

commit;
