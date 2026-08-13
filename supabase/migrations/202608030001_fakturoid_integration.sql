-- Fakturoid accounting document registry and non-secret operational settings.
-- The integration is disabled by default. API credentials remain server-only secrets.

begin;

create table if not exists public.accounting_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'fakturoid' check (provider = 'fakturoid'),
  status text not null default 'pending'
    check (status in ('pending', 'creating', 'created', 'sent', 'failed', 'cancelled')),
  trigger_source text not null default 'system'
    check (trigger_source in ('payment_webhook', 'shipment', 'admin_status', 'admin_manual', 'system')),
  remote_subject_id bigint,
  remote_document_id bigint,
  document_number text,
  variable_symbol text,
  html_url text,
  public_url text,
  pdf_url text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  issued_at timestamptz,
  sent_at timestamptz,
  unique (order_id, provider),
  unique (provider, remote_document_id)
);

create index if not exists accounting_documents_status_idx
  on public.accounting_documents(status, updated_at);

drop trigger if exists accounting_documents_updated_at on public.accounting_documents;
create trigger accounting_documents_updated_at
  before update on public.accounting_documents
  for each row execute function public.set_updated_at();

drop trigger if exists audit_accounting_documents on public.accounting_documents;
create trigger audit_accounting_documents
  after insert or update or delete on public.accounting_documents
  for each row execute function public.audit_admin_change();

alter table public.accounting_documents enable row level security;

drop policy if exists admins_manage_accounting_documents on public.accounting_documents;
create policy admins_manage_accounting_documents on public.accounting_documents
  for all
  using (public.is_admin_user(array['admin'::public.admin_role]))
  with check (public.is_admin_user(array['admin'::public.admin_role]));

insert into public.integration_settings(key, value, description) values (
  'fakturoid',
  '{
    "enabled": false,
    "automaticTrigger": "delivered",
    "sendAutomatically": true,
    "dueDays": 0
  }'::jsonb,
  'Non-secret Fakturoid settings. Account slug, Client ID and Client Secret remain server-only secrets.'
)
on conflict (key) do nothing;

commit;
