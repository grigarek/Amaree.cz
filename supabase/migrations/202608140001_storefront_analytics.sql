create table if not exists public.storefront_analytics_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  event_type text not null check (event_type in ('page_view', 'page_engagement')),
  locale text not null check (locale in ('cs', 'sk')),
  path text not null check (char_length(path) between 1 and 500),
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 86400),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 255),
  created_at timestamptz not null default now()
);

create index if not exists storefront_analytics_created_at_idx on public.storefront_analytics_events (created_at desc);
create index if not exists storefront_analytics_path_created_at_idx on public.storefront_analytics_events (path, created_at desc);
create index if not exists storefront_analytics_session_created_at_idx on public.storefront_analytics_events (session_id, created_at desc);

alter table public.storefront_analytics_events enable row level security;
revoke all on table public.storefront_analytics_events from anon, authenticated;
revoke all on sequence public.storefront_analytics_events_id_seq from anon, authenticated;

comment on table public.storefront_analytics_events is 'First-party consented storefront analytics without IP addresses, user agents, or customer identifiers.';

create or replace function public.cleanup_storefront_analytics_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.storefront_analytics_events where created_at < now() - interval '90 days';
  return null;
end;
$$;

revoke all on function public.cleanup_storefront_analytics_events() from public, anon, authenticated;
drop trigger if exists cleanup_storefront_analytics_events_trigger on public.storefront_analytics_events;
create trigger cleanup_storefront_analytics_events_trigger
after insert on public.storefront_analytics_events
for each statement execute function public.cleanup_storefront_analytics_events();
