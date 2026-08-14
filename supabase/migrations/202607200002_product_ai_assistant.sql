begin;

alter table public.products
  add column if not exists style_tags text[] not null default array[]::text[];

alter table public.product_translations
  add column if not exists length text not null default '',
  add column if not exists clasp_type text not null default '',
  add column if not exists finish text not null default '',
  add column if not exists stones text not null default '';

comment on column public.products.style_tags is 'Optional curated style labels for future catalog filtering; never published automatically by AI.';

create table if not exists public.product_ai_requests (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  status text not null check (status in ('pending', 'success', 'error')),
  model text not null check (length(model) between 2 and 100),
  requested_fields text[] not null default array[]::text[],
  applied_fields text[] not null default array[]::text[],
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  error_code text check (error_code is null or length(error_code) <= 80),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists product_ai_requests_admin_created_idx
  on public.product_ai_requests(admin_user_id, created_at desc);
create index if not exists product_ai_requests_product_idx
  on public.product_ai_requests(product_id, created_at desc)
  where product_id is not null;

comment on table public.product_ai_requests is 'Minimal operational log for manually requested product-content suggestions. It stores no images, prompts or generated content.';

alter table public.product_ai_requests enable row level security;

drop policy if exists admins_read_own_product_ai_requests on public.product_ai_requests;
create policy admins_read_own_product_ai_requests on public.product_ai_requests
  for select using (admin_user_id = auth.uid() and public.is_admin_user());

revoke all on public.product_ai_requests from anon, authenticated;
grant select on public.product_ai_requests to authenticated;

create or replace function public.admin_start_product_ai_request(
  p_product_id uuid,
  p_model text,
  p_requested_fields text[]
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  request_id uuid;
begin
  if not public.is_admin_user() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_requested_fields), 0) < 1 or cardinality(p_requested_fields) > 11 then
    raise exception 'invalid_ai_fields';
  end if;
  if exists (
    select 1 from unnest(p_requested_fields) field
    where field <> all(array['name','shortDescription','longDescription','seoTitle','seoDescription','slug','skuSuggestion','imageAltTexts','categorySuggestion','colors','tags'])
  ) then raise exception 'invalid_ai_fields'; end if;
  if p_product_id is not null and not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'product_not_found';
  end if;
  if (
    select count(*) from public.product_ai_requests
    where admin_user_id = auth.uid() and created_at >= now() - interval '15 minutes'
  ) >= 5 then
    raise exception 'ai_rate_limit';
  end if;
  if (
    select count(*) from public.product_ai_requests
    where admin_user_id = auth.uid() and created_at >= now() - interval '24 hours'
  ) >= 30 then
    raise exception 'ai_rate_limit';
  end if;

  insert into public.product_ai_requests(admin_user_id, product_id, status, model, requested_fields)
  values (auth.uid(), p_product_id, 'pending', p_model, p_requested_fields)
  returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.admin_finish_product_ai_request(
  p_request_id uuid,
  p_status text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin_user() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_status not in ('success', 'error') then raise exception 'invalid_ai_status'; end if;
  update public.product_ai_requests
  set status = p_status,
      input_tokens = p_input_tokens,
      output_tokens = p_output_tokens,
      error_code = left(p_error_code, 80),
      completed_at = now()
  where id = p_request_id and admin_user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'ai_request_not_found'; end if;
end;
$$;

create or replace function public.admin_record_product_ai_applied_fields(
  p_request_id uuid,
  p_applied_fields text[]
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin_user() then raise exception 'admin_required' using errcode = '42501'; end if;
  if coalesce(cardinality(p_applied_fields), 0) > 11 then raise exception 'invalid_ai_fields'; end if;
  if exists (
    select 1 from unnest(p_applied_fields) field
    where field <> all(array['name','shortDescription','longDescription','seoTitle','seoDescription','slug','skuSuggestion','imageAltTexts','categorySuggestion','colors','tags'])
  ) then raise exception 'invalid_ai_fields'; end if;
  update public.product_ai_requests
  set applied_fields = p_applied_fields
  where id = p_request_id and admin_user_id = auth.uid() and status = 'success';
  if not found then raise exception 'ai_request_not_found'; end if;
end;
$$;

revoke all on function public.admin_start_product_ai_request(uuid, text, text[]) from public;
revoke all on function public.admin_finish_product_ai_request(uuid, text, integer, integer, text) from public;
revoke all on function public.admin_record_product_ai_applied_fields(uuid, text[]) from public;
grant execute on function public.admin_start_product_ai_request(uuid, text, text[]) to authenticated;
grant execute on function public.admin_finish_product_ai_request(uuid, text, integer, integer, text) to authenticated;
grant execute on function public.admin_record_product_ai_applied_fields(uuid, text[]) to authenticated;

commit;
