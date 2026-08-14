-- AMAREE operational settings and provider-independent transactional e-mail metadata.
-- Safe for the development/staging Supabase project. Review again before production.

begin;

update public.shipping_options
set price_minor = 850, free_from_minor = null
where country = 'SK' and currency = 'EUR' and code in ('packeta_pickup', 'packeta_home');

update public.payment_options
set fee_minor = 150
where country = 'SK' and currency = 'EUR' and code = 'cash_on_delivery';

alter table public.email_messages
  drop constraint if exists email_messages_locale_check;

alter table public.email_messages
  add constraint email_messages_locale_check check (locale in ('cs', 'sk', 'en', 'de')),
  alter column provider set default 'resend',
  add column if not exists triggered_by uuid references auth.users(id) on delete set null,
  add column if not exists trigger_source text not null default 'system'
    check (trigger_source in ('checkout', 'payment_webhook', 'admin_status', 'admin_manual', 'shipment', 'complaint', 'system')),
  add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0),
  add column if not exists last_attempt_at timestamptz,
  add column if not exists provider_response jsonb not null default '{}'::jsonb;

create index if not exists email_messages_usage_idx
  on public.email_messages(provider, status, sent_at)
  where status = 'sent';

create table if not exists public.integration_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.integration_settings(key, value, description) values
  (
    'packeta',
    '{
      "senderLabel": "",
      "defaultHandoverPoint": "",
      "defaultWeightKg": 0.5,
      "homeCarrierIdCz": "",
      "homeCarrierIdSk": "",
      "cod": {
        "CZ": {"pickup": false, "zbox": false, "home": false},
        "SK": {"pickup": false, "zbox": false, "home": false}
      }
    }'::jsonb,
    'Packeta operational settings. API password remains a server-only secret.'
  ),
  (
    'transactional_email',
    '{
      "provider": "resend",
      "dailyWarningLimit": 80,
      "monthlyWarningLimit": 2400
    }'::jsonb,
    'Non-secret transactional e-mail settings. API keys remain server-only secrets.'
  )
on conflict (key) do nothing;

drop trigger if exists integration_settings_updated_at on public.integration_settings;
create trigger integration_settings_updated_at
  before update on public.integration_settings
  for each row execute function public.set_updated_at();

drop trigger if exists audit_integration_settings on public.integration_settings;
create trigger audit_integration_settings
  after insert or update or delete on public.integration_settings
  for each row execute function public.audit_admin_change();

alter table public.integration_settings enable row level security;

drop policy if exists admins_manage_integration_settings on public.integration_settings;
create policy admins_manage_integration_settings on public.integration_settings
  for all
  using (public.is_admin_user(array['admin'::public.admin_role]))
  with check (public.is_admin_user(array['admin'::public.admin_role]));

commit;
