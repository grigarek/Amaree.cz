-- Birthday rewards are issued only on the customer's birthday. The legacy
-- lead-time column remains for backward compatibility with deployed schemas.

alter table public.loyalty_program_settings
  alter column birthday_issue_days_before set default 0;

update public.loyalty_program_settings
set birthday_issue_days_before = 0,
    updated_at = now()
where id = true;

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

revoke all on function public.process_birthday_rewards(integer) from public, anon, authenticated;
grant execute on function public.process_birthday_rewards(integer) to service_role;
