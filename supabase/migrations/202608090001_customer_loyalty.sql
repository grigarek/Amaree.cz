-- Customer accounts and percentage loyalty rewards. Additive and disabled by
-- default until the storefront and e-mail flow have been verified.

alter table public.orders
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

alter table public.discount_codes
  add column if not exists customer_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists source text not null default 'admin'
    check (source in ('admin', 'loyalty', 'birthday'));

create index if not exists orders_customer_user_idx on public.orders(customer_user_id, created_at desc);
create index if not exists discount_codes_customer_idx on public.discount_codes(customer_user_id, active, valid_to);

create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  phone text,
  locale text not null default 'cs' check (locale in ('cs', 'sk', 'en', 'de')),
  birthday_month smallint check (birthday_month between 1 and 12),
  birthday_day smallint check (birthday_day between 1 and 31),
  birthday_set_at timestamptz,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_program_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  reward_percent integer not null default 10 check (reward_percent between 1 and 50),
  threshold_czk_minor integer not null default 300000 check (threshold_czk_minor > 0),
  threshold_eur_minor integer not null default 12000 check (threshold_eur_minor > 0),
  minimum_order_czk_minor integer not null default 120000 check (minimum_order_czk_minor >= 0),
  minimum_order_eur_minor integer not null default 5000 check (minimum_order_eur_minor >= 0),
  reward_valid_days integer not null default 90 check (reward_valid_days between 1 and 730),
  confirmation_delay_days integer not null default 30 check (confirmation_delay_days between 0 and 120),
  birthday_reward_enabled boolean not null default false,
  birthday_reward_percent integer not null default 10 check (birthday_reward_percent between 1 and 50),
  birthday_reward_valid_days integer not null default 30 check (birthday_reward_valid_days between 1 and 365),
  birthday_issue_days_before integer not null default 0 check (birthday_issue_days_before between 0 and 60),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.loyalty_program_settings(id) values (true) on conflict (id) do nothing;

create table if not exists public.loyalty_accounts (
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null check (currency in ('CZK', 'EUR')),
  progress_minor integer not null default 0 check (progress_minor >= 0),
  lifetime_eligible_minor integer not null default 0 check (lifetime_eligible_minor >= 0),
  rewards_issued integer not null default 0 check (rewards_issued >= 0),
  updated_at timestamptz not null default now(),
  primary key(customer_user_id, currency)
);

create table if not exists public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  currency text not null check (currency in ('CZK', 'EUR')),
  event_type text not null check (event_type in ('purchase_confirmed', 'purchase_reversed', 'manual_adjustment')),
  amount_minor integer not null,
  note text,
  created_at timestamptz not null default now(),
  unique(order_id, event_type)
);

create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  discount_code_id uuid not null unique references public.discount_codes(id) on delete cascade,
  currency text not null check (currency in ('CZK', 'EUR')),
  reward_percent integer not null check (reward_percent between 1 and 50),
  reward_type text not null default 'threshold' check (reward_type in ('threshold', 'birthday')),
  reward_year integer,
  status text not null default 'available' check (status in ('available', 'redeemed', 'expired', 'revoked')),
  expires_at timestamptz not null,
  redeemed_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

create index if not exists loyalty_rewards_customer_idx on public.loyalty_rewards(customer_user_id, status, expires_at desc);
create unique index if not exists loyalty_birthday_reward_unique
  on public.loyalty_rewards(customer_user_id, reward_type, reward_year)
  where reward_type = 'birthday';
create index if not exists loyalty_ledger_customer_idx on public.loyalty_ledger(customer_user_id, created_at desc);

create or replace function public.create_customer_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.customer_profiles(user_id, email, first_name, last_name, locale)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    case when new.raw_user_meta_data ->> 'locale' in ('cs', 'sk', 'en', 'de') then new.raw_user_meta_data ->> 'locale' else 'cs' end
  ) on conflict (user_id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_profile_after_auth_user on auth.users;
create trigger customer_profile_after_auth_user
after insert or update of email on auth.users
for each row execute function public.create_customer_profile();

insert into public.customer_profiles(user_id, email)
select id, lower(coalesce(email, '')) from auth.users
on conflict (user_id) do nothing;

create or replace function public.process_loyalty_rewards(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  settings public.loyalty_program_settings;
  order_row record;
  account_row public.loyalty_accounts;
  threshold_value integer;
  minimum_value integer;
  eligible_value integer;
  reward_code text;
  discount_id uuid;
  processed integer := 0;
  issued integer := 0;
begin
  select * into settings from public.loyalty_program_settings where id = true;
  if not found or not settings.enabled then
    return jsonb_build_object('skipped', true, 'processed', 0, 'issued', 0);
  end if;

  for order_row in
    select o.*
    from public.orders o
    where o.status = 'delivered'
      and o.customer_user_id is not null
      and exists (
        select 1 from public.order_status_history h
        where h.order_id = o.id and h.new_status = 'delivered'
          and h.created_at <= now() - make_interval(days => settings.confirmation_delay_days)
      )
      and not exists (
        select 1 from public.loyalty_ledger l
        where l.order_id = o.id and l.event_type = 'purchase_confirmed'
      )
    order by o.created_at
    limit least(greatest(p_limit, 1), 500)
    for update skip locked
  loop
    eligible_value := greatest(order_row.subtotal_minor - order_row.discount_minor, 0);
    insert into public.loyalty_ledger(customer_user_id, order_id, currency, event_type, amount_minor)
    values (order_row.customer_user_id, order_row.id, order_row.currency, 'purchase_confirmed', eligible_value);

    insert into public.loyalty_accounts(customer_user_id, currency, progress_minor, lifetime_eligible_minor)
    values (order_row.customer_user_id, order_row.currency, eligible_value, eligible_value)
    on conflict (customer_user_id, currency) do update set
      progress_minor = public.loyalty_accounts.progress_minor + excluded.progress_minor,
      lifetime_eligible_minor = public.loyalty_accounts.lifetime_eligible_minor + excluded.lifetime_eligible_minor,
      updated_at = now()
    returning * into account_row;

    threshold_value := case when order_row.currency = 'EUR' then settings.threshold_eur_minor else settings.threshold_czk_minor end;
    minimum_value := case when order_row.currency = 'EUR' then settings.minimum_order_eur_minor else settings.minimum_order_czk_minor end;

    while account_row.progress_minor >= threshold_value loop
      reward_code := 'KLUB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      insert into public.discount_codes(
        code, internal_name, discount_type, value, currency, minimum_order_minor,
        active, valid_from, valid_to, usage_limit, customer_user_id, source
      ) values (
        reward_code, 'Věrnostní odměna ' || reward_code, 'percent', settings.reward_percent,
        order_row.currency, minimum_value, true, now(), now() + make_interval(days => settings.reward_valid_days),
        1, order_row.customer_user_id, 'loyalty'
      ) returning id into discount_id;
      insert into public.loyalty_rewards(customer_user_id, discount_code_id, currency, reward_percent, expires_at)
      values (order_row.customer_user_id, discount_id, order_row.currency, settings.reward_percent, now() + make_interval(days => settings.reward_valid_days));
      account_row.progress_minor := account_row.progress_minor - threshold_value;
      account_row.rewards_issued := account_row.rewards_issued + 1;
      issued := issued + 1;
    end loop;

    update public.loyalty_accounts set
      progress_minor = account_row.progress_minor,
      rewards_issued = account_row.rewards_issued,
      updated_at = now()
    where customer_user_id = account_row.customer_user_id and currency = account_row.currency;
    processed := processed + 1;
  end loop;

  update public.loyalty_rewards set status = 'expired'
  where status = 'available' and expires_at < now();
  update public.discount_codes dc set active = false
  where dc.source = 'loyalty' and dc.valid_to < now() and dc.active;

  return jsonb_build_object('skipped', false, 'processed', processed, 'issued', issued);
end;
$$;

create or replace function public.set_customer_birthday(p_month integer, p_day integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'authentication_required';
  end if;
  perform make_date(2000, p_month, p_day);
  update public.customer_profiles
  set birthday_month = p_month,
      birthday_day = p_day,
      birthday_set_at = now(),
      updated_at = now()
  where user_id = current_user_id
    and birthday_month is null
    and birthday_day is null;
  return found;
exception when datetime_field_overflow then
  raise exception 'invalid_birthday';
end;
$$;

create or replace function public.process_birthday_rewards(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  settings public.loyalty_program_settings;
  profile_row record;
  birthday_date date;
  reward_currency text;
  minimum_value integer;
  reward_code text;
  discount_id uuid;
  issued integer := 0;
begin
  select * into settings from public.loyalty_program_settings where id = true;
  if not found or not settings.enabled or not settings.birthday_reward_enabled then
    return jsonb_build_object('skipped', true, 'issued', 0);
  end if;

  for profile_row in
    select p.*
    from public.customer_profiles p
    where p.birthday_month is not null
      and p.birthday_day is not null
      and exists (
        select 1 from public.loyalty_accounts a
        where a.customer_user_id = p.user_id and a.lifetime_eligible_minor > 0
      )
    order by p.user_id
    limit least(greatest(p_limit, 1), 500)
  loop
    birthday_date := make_date(
      extract(year from current_date)::integer,
      profile_row.birthday_month,
      least(
        profile_row.birthday_day,
        extract(day from (make_date(extract(year from current_date)::integer, profile_row.birthday_month, 1) + interval '1 month - 1 day'))::integer
      )
    );
    if current_date <> birthday_date then
      continue;
    end if;
    if exists (
      select 1 from public.loyalty_rewards r
      where r.customer_user_id = profile_row.user_id
        and r.reward_type = 'birthday'
        and r.reward_year = extract(year from birthday_date)::integer
    ) then
      continue;
    end if;

    reward_currency := case when profile_row.locale = 'cs' then 'CZK' else 'EUR' end;
    minimum_value := case when reward_currency = 'EUR' then settings.minimum_order_eur_minor else settings.minimum_order_czk_minor end;
    reward_code := 'NAROZENINY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    insert into public.discount_codes(
      code, internal_name, discount_type, value, currency, minimum_order_minor,
      active, valid_from, valid_to, usage_limit, customer_user_id, source
    ) values (
      reward_code,
      'Narozeninová odměna ' || extract(year from birthday_date)::integer,
      'percent', settings.birthday_reward_percent, reward_currency, minimum_value,
      true, now(), now() + make_interval(days => settings.birthday_reward_valid_days),
      1, profile_row.user_id, 'birthday'
    ) returning id into discount_id;
    insert into public.loyalty_rewards(
      customer_user_id, discount_code_id, currency, reward_percent, reward_type, reward_year, expires_at
    ) values (
      profile_row.user_id, discount_id, reward_currency, settings.birthday_reward_percent,
      'birthday', extract(year from birthday_date)::integer,
      now() + make_interval(days => settings.birthday_reward_valid_days)
    );
    issued := issued + 1;
  end loop;

  update public.loyalty_rewards set status = 'expired'
  where status = 'available' and expires_at < now();
  update public.discount_codes dc set active = false
  where dc.source in ('loyalty', 'birthday') and dc.valid_to < now() and dc.active;
  return jsonb_build_object('skipped', false, 'issued', issued);
end;
$$;

create or replace function public.mark_loyalty_reward_redeemed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.loyalty_rewards
  set status = 'redeemed', redeemed_order_id = new.order_id, redeemed_at = now()
  where discount_code_id = new.discount_code_id and status = 'available';
  return new;
end;
$$;

drop trigger if exists loyalty_reward_after_redemption on public.discount_redemptions;
create trigger loyalty_reward_after_redemption
after insert on public.discount_redemptions
for each row execute function public.mark_loyalty_reward_redeemed();

alter table public.customer_profiles enable row level security;
alter table public.loyalty_program_settings enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_ledger enable row level security;
alter table public.loyalty_rewards enable row level security;

create policy customers_read_own_profile on public.customer_profiles for select using (auth.uid() = user_id);
create policy customers_update_own_profile on public.customer_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy customers_read_loyalty_settings on public.loyalty_program_settings for select using (auth.role() = 'authenticated');
create policy customers_read_own_loyalty_account on public.loyalty_accounts for select using (auth.uid() = customer_user_id);
create policy customers_read_own_loyalty_ledger on public.loyalty_ledger for select using (auth.uid() = customer_user_id);
create policy customers_read_own_loyalty_rewards on public.loyalty_rewards for select using (auth.uid() = customer_user_id);

create policy admins_manage_customer_profiles on public.customer_profiles for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_loyalty_settings on public.loyalty_program_settings for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_loyalty_accounts on public.loyalty_accounts for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_loyalty_ledger on public.loyalty_ledger for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy admins_manage_loyalty_rewards on public.loyalty_rewards for all using (public.is_admin_user(array['admin'::public.admin_role])) with check (public.is_admin_user(array['admin'::public.admin_role]));

revoke all on function public.process_loyalty_rewards(integer) from public, anon, authenticated;
grant execute on function public.process_loyalty_rewards(integer) to service_role;
revoke all on function public.process_birthday_rewards(integer) from public, anon, authenticated;
grant execute on function public.process_birthday_rewards(integer) to service_role;
revoke all on function public.set_customer_birthday(integer, integer) from public, anon;
grant execute on function public.set_customer_birthday(integer, integer) to authenticated;

revoke update on public.customer_profiles from authenticated;
grant update (first_name, last_name, phone, locale, marketing_consent, marketing_consent_at, updated_at)
  on public.customer_profiles to authenticated;
