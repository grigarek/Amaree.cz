begin;

do $$
begin
  create type public.precious_metal_kind as enum ('gold', 'silver', 'platinum', 'other');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.mark_presence_status as enum ('yes', 'no', 'not_applicable');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.hallmark_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key boolean not null default true unique check (singleton_key),
  trades_precious_metals boolean not null default false,
  assay_office_registered boolean not null default false,
  registration_note text not null default '',
  registration_date date,
  registry_url text not null default '',
  hallmark_image_path text,
  hallmark_image_filename text,
  public_document_path text,
  public_document_filename text,
  public_text text not null default '',
  public_page_enabled boolean not null default false,
  footer_link_enabled boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.hallmark_settings(singleton_key)
values (true)
on conflict (singleton_key) do nothing;

create table if not exists public.product_material_compliance (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  material_type text not null default '',
  precious_metal boolean not null default false,
  precious_metal_kind public.precious_metal_kind,
  fineness text not null default '',
  precious_metal_weight_grams numeric(12,3),
  hallmark_status public.mark_presence_status not null default 'not_applicable',
  fineness_mark_status public.mark_presence_status not null default 'not_applicable',
  exemption_reason text not null default '',
  country_of_origin text not null default '',
  supplier_document_path text,
  supplier_document_filename text,
  product_certificate_path text,
  product_certificate_filename text,
  internal_note text not null default '',
  public_customer_information text not null default '',
  details_verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (precious_metal_weight_grams is null or precious_metal_weight_grams > 0),
  check (precious_metal or precious_metal_kind is null),
  check (precious_metal or fineness = ''),
  check (precious_metal or precious_metal_weight_grams is null)
);

comment on table public.hallmark_settings is 'Singleton editorial configuration for Czech hallmark information and its conditional public page.';
comment on table public.product_material_compliance is 'Admin-managed material, hallmark and supporting-document facts. AI must never populate these fields.';
comment on column public.product_material_compliance.details_verified is 'Manual confirmation that protected public claims are supported by documentation.';

create trigger hallmark_settings_updated_at
  before update on public.hallmark_settings
  for each row execute function public.set_updated_at();
create trigger product_material_compliance_updated_at
  before update on public.product_material_compliance
  for each row execute function public.set_updated_at();
create trigger audit_hallmark_settings
  after insert or update or delete on public.hallmark_settings
  for each row execute function public.audit_admin_change();
create trigger audit_product_material_compliance
  after insert or update or delete on public.product_material_compliance
  for each row execute function public.audit_admin_change();

alter table public.hallmark_settings enable row level security;
alter table public.product_material_compliance enable row level security;

create policy hallmark_settings_admin_all on public.hallmark_settings
  for all using (public.is_admin_user(array['admin'::public.admin_role]))
  with check (public.is_admin_user(array['admin'::public.admin_role]));
create policy hallmark_settings_public_read on public.hallmark_settings
  for select using (
    public_page_enabled
    and trades_precious_metals
    and length(trim(public_text)) >= 20
    and (
      not assay_office_registered
      or length(trim(registration_note)) > 0
      or registry_url is not null
    )
  );
create policy product_material_compliance_admin_all on public.product_material_compliance
  for all using (public.is_admin_user())
  with check (public.is_admin_user());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-compliance-assets',
  'public-compliance-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-compliance-documents',
  'private-compliance-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy compliance_assets_admin_insert on storage.objects for insert
  with check (bucket_id in ('public-compliance-assets', 'private-compliance-documents') and public.is_admin_user());
create policy compliance_assets_admin_update on storage.objects for update
  using (bucket_id in ('public-compliance-assets', 'private-compliance-documents') and public.is_admin_user())
  with check (bucket_id in ('public-compliance-assets', 'private-compliance-documents') and public.is_admin_user());
create policy compliance_assets_admin_delete on storage.objects for delete
  using (bucket_id in ('public-compliance-assets', 'private-compliance-documents') and public.is_admin_user());
create policy private_compliance_admin_read on storage.objects for select
  using (bucket_id = 'private-compliance-documents' and public.is_admin_user());

create or replace function public.admin_product_publish_issues(p_product_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  issues text[] := array[]::text[];
  public_copy text := '';
  compliance_verified boolean := false;
begin
  if not public.is_admin_user() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'product_not_found';
  end if;

  if not exists (
    select 1 from public.product_translations
    where product_id = p_product_id and locale = 'cs' and length(trim(name)) >= 2
  ) then issues := array_append(issues, 'name'); end if;

  if not exists (
    select 1 from public.product_translations
    where product_id = p_product_id and locale = 'cs' and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ) then issues := array_append(issues, 'slug'); end if;

  if not exists (
    select 1 from public.product_prices
    where product_id = p_product_id and currency = 'CZK' and amount_minor > 0
  ) then issues := array_append(issues, 'price'); end if;

  if not exists (
    select 1 from public.inventory_items
    where product_id = p_product_id and variant_id is null and quantity >= 0
  ) then issues := array_append(issues, 'inventory'); end if;

  if not exists (
    select 1 from public.product_images
    where product_id = p_product_id and is_primary and archived_at is null
  ) then issues := array_append(issues, 'primary_image'); end if;

  select coalesce(bool_or(details_verified), false),
         coalesce(string_agg(public_customer_information, ' '), '')
  into compliance_verified, public_copy
  from public.product_material_compliance
  where product_id = p_product_id;

  select concat_ws(' ', public_copy, string_agg(concat_ws(' ',
    name, short_description, long_description, material, dimensions, care,
    seo_title, seo_description
  ), ' '))
  into public_copy
  from public.product_translations
  where product_id = p_product_id;

  if not compliance_verified and lower(coalesce(public_copy, '')) ~
    '(zkontrolov[aá]no puncovn[ií]m [uú]řadem|certifikov[aá]no puncovn[ií]m [uú]řadem|opatřen[oa]? českým puncem|stříbro[[:space:]]*925|zlato[[:space:]]*585)'
  then
    issues := array_append(issues, 'unverified_hallmark_claims');
  end if;

  return issues;
end;
$$;

revoke all on function public.admin_product_publish_issues(uuid) from public;
grant execute on function public.admin_product_publish_issues(uuid) to authenticated;

commit;
