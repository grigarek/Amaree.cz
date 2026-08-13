begin;

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
  if not public.is_admin_user() then raise exception 'admin_required' using errcode = '42501'; end if;
  if coalesce(cardinality(p_requested_fields), 0) < 1 or cardinality(p_requested_fields) > 13 then raise exception 'invalid_ai_fields'; end if;
  if exists (
    select 1 from unnest(p_requested_fields) field
    where field <> all(array['name','shortDescription','longDescription','seoTitle','seoDescription','slug','skuSuggestion','imageAltTexts','categorySuggestion','colors','tags','dimensions','clasp'])
  ) then raise exception 'invalid_ai_fields'; end if;
  if p_product_id is not null and not exists (select 1 from public.products where id = p_product_id) then raise exception 'product_not_found'; end if;
  if (select count(*) from public.product_ai_requests where admin_user_id = auth.uid() and created_at >= now() - interval '15 minutes') >= 5 then raise exception 'ai_rate_limit'; end if;
  if (select count(*) from public.product_ai_requests where admin_user_id = auth.uid() and created_at >= now() - interval '24 hours') >= 30 then raise exception 'ai_rate_limit'; end if;

  insert into public.product_ai_requests(admin_user_id, product_id, status, model, requested_fields)
  values (auth.uid(), p_product_id, 'pending', p_model, p_requested_fields)
  returning id into request_id;
  return request_id;
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
  if coalesce(cardinality(p_applied_fields), 0) > 13 then raise exception 'invalid_ai_fields'; end if;
  if exists (
    select 1 from unnest(p_applied_fields) field
    where field <> all(array['name','shortDescription','longDescription','seoTitle','seoDescription','slug','skuSuggestion','imageAltTexts','categorySuggestion','colors','tags','dimensions','clasp'])
  ) then raise exception 'invalid_ai_fields'; end if;
  update public.product_ai_requests
  set applied_fields = p_applied_fields
  where id = p_request_id and admin_user_id = auth.uid() and status = 'success';
  if not found then raise exception 'ai_request_not_found'; end if;
end;
$$;

revoke all on function public.admin_start_product_ai_request(uuid, text, text[]) from public;
revoke all on function public.admin_record_product_ai_applied_fields(uuid, text[]) from public;
grant execute on function public.admin_start_product_ai_request(uuid, text, text[]) to authenticated;
grant execute on function public.admin_record_product_ai_applied_fields(uuid, text[]) to authenticated;

commit;
