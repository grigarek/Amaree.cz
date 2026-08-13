alter table public.orders
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists terms_snapshot jsonb;

comment on column public.orders.terms_accepted_at is 'Server-recorded timestamp of the required checkout terms consent.';
comment on column public.orders.terms_version is 'Immutable identifier of the terms presented at checkout.';
comment on column public.orders.terms_snapshot is 'Exact terms content attached to the order confirmation in a durable file.';

alter table public.orders
  add constraint orders_terms_acceptance_complete check (
    (terms_accepted_at is null and terms_version is null and terms_snapshot is null)
    or
    (terms_accepted_at is not null and length(trim(terms_version)) > 0 and jsonb_typeof(terms_snapshot) = 'object')
  ) not valid;

alter table public.orders validate constraint orders_terms_acceptance_complete;
