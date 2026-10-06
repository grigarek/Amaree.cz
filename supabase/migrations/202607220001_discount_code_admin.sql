alter table public.discount_codes
  add column if not exists internal_name text not null default '',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.discount_codes
set internal_name = code
where trim(internal_name) = '';

alter table public.discount_codes
  add constraint discount_codes_internal_name_not_blank check (length(trim(internal_name)) > 0),
  add constraint discount_codes_percent_range check (discount_type <> 'percent' or value between 1 and 100),
  add constraint discount_codes_fixed_currency check (discount_type <> 'fixed' or currency is not null),
  add constraint discount_codes_validity_order check (valid_from is null or valid_to is null or valid_to > valid_from),
  add constraint discount_codes_usage_count_limit check (usage_limit is null or usage_count <= usage_limit);

create index if not exists discount_codes_admin_list_idx
  on public.discount_codes (active desc, updated_at desc);

create or replace function public.set_discount_code_actor()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists discount_codes_actor on public.discount_codes;
create trigger discount_codes_actor
before insert or update on public.discount_codes
for each row execute function public.set_discount_code_actor();
