begin;

alter table public.category_translations drop constraint if exists category_translations_locale_check;
alter table public.category_translations add constraint category_translations_locale_check check (locale in ('cs', 'sk', 'en', 'de'));

alter table public.product_translations drop constraint if exists product_translations_locale_check;
alter table public.product_translations add constraint product_translations_locale_check check (locale in ('cs', 'sk', 'en', 'de'));

alter table public.product_variant_translations drop constraint if exists product_variant_translations_locale_check;
alter table public.product_variant_translations add constraint product_variant_translations_locale_check check (locale in ('cs', 'sk', 'en', 'de'));

alter table public.product_image_translations drop constraint if exists product_image_translations_locale_check;
alter table public.product_image_translations add constraint product_image_translations_locale_check check (locale in ('cs', 'sk', 'en', 'de'));

alter table public.orders drop constraint if exists orders_locale_check;
alter table public.orders add constraint orders_locale_check check (locale in ('cs', 'sk', 'en', 'de'));

alter table public.email_messages drop constraint if exists email_messages_locale_check;
alter table public.email_messages add constraint email_messages_locale_check check (locale in ('cs', 'sk', 'en', 'de'));

insert into public.category_translations(category_id, locale, slug, name, description)
select id, 'sk', 'nahrdelniky', 'Náhrdelníky', 'Nadčasové línie na každý deň.'
from public.categories where internal_slug = 'necklaces'
on conflict (category_id, locale) do update set
  slug = excluded.slug, name = excluded.name, description = excluded.description;

insert into public.category_translations(category_id, locale, slug, name, description)
select id, 'sk', 'nausnice', 'Náušnice', 'Jemné náušnice pre každodennú eleganciu.'
from public.categories where internal_slug = 'earrings'
on conflict (category_id, locale) do update set
  slug = excluded.slug, name = excluded.name, description = excluded.description;

insert into public.category_translations(category_id, locale, slug, name, description)
select id, 'sk', 'naramky', 'Náramky', 'Minimalistické náramky na vrstvenie.'
from public.categories where internal_slug = 'bracelets'
on conflict (category_id, locale) do update set
  slug = excluded.slug, name = excluded.name, description = excluded.description;

-- Existing products remain usable while their Slovak copy is reviewed in admin.
insert into public.product_translations(
  product_id, locale, slug, name, short_description, long_description,
  material, color, dimensions, care, seo_title, seo_description
)
select
  product_id, 'sk', slug, name, short_description, long_description,
  material, color, dimensions, care, seo_title, seo_description
from public.product_translations
where locale = 'cs'
on conflict (product_id, locale) do nothing;

insert into public.product_variant_translations(variant_id, locale, name, material, color, dimensions)
select variant_id, 'sk', name, material, color, dimensions
from public.product_variant_translations
where locale = 'cs'
on conflict (variant_id, locale) do nothing;

insert into public.product_image_translations(image_id, locale, alt_text)
select image_id, 'sk', alt_text
from public.product_image_translations
where locale = 'cs'
on conflict (image_id, locale) do nothing;

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
    select 1 from public.product_translations
    where product_id = p_product_id and locale = 'sk' and length(trim(name)) >= 2
  ) then issues := array_append(issues, 'name_sk'); end if;

  if not exists (
    select 1 from public.product_translations
    where product_id = p_product_id and locale = 'sk' and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ) then issues := array_append(issues, 'slug_sk'); end if;

  if not exists (
    select 1 from public.product_prices
    where product_id = p_product_id and currency = 'CZK' and amount_minor > 0
  ) then issues := array_append(issues, 'price'); end if;

  if not exists (
    select 1 from public.product_prices
    where product_id = p_product_id and currency = 'EUR' and amount_minor > 0
  ) then issues := array_append(issues, 'price_eur'); end if;

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
    '(zkontrolov[aá]no puncovn[ií]m [uú]řadem|certifikov[aá]no puncovn[ií]m [uú]řadem|opatřen[oa]? českým puncem|stříbro[[:space:]]*925|zlato[[:space:]]*585|skontrolovan[eé] puncov[yý]m [uú]radom|certifikovan[eé] puncov[yý]m [uú]radom|opatren[eé] (česk[yý]m|slovensk[yý]m) puncom|striebro[[:space:]]*925)'
  then
    issues := array_append(issues, 'unverified_hallmark_claims');
  end if;

  return issues;
end;
$$;

revoke all on function public.admin_product_publish_issues(uuid) from public;
grant execute on function public.admin_product_publish_issues(uuid) to authenticated;

create or replace function public.admin_upsert_product(p_product_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_product_id uuid := coalesce(p_product_id, gen_random_uuid());
  target_category_id uuid;
  target_status public.product_publication_status := coalesce(p_payload->>'publicationStatus', 'draft')::public.product_publication_status;
  selected_locale text;
  translation jsonb;
  selected_currency text;
  price_data jsonb;
  publish_issues text[];
begin
  if not public.is_admin_user() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select id into target_category_id
  from public.categories
  where internal_slug = p_payload->>'category' and active;
  if target_category_id is null then raise exception 'category_not_found'; end if;

  insert into public.products(
    id, sku, category_id, weight_grams, active, publication_status, featured, is_new,
    sort_order, low_stock_threshold, archived_at
  ) values (
    target_product_id,
    upper(p_payload->>'sku'),
    target_category_id,
    nullif(p_payload->>'weightGrams', '')::numeric,
    false,
    'draft',
    coalesce((p_payload->>'featured')::boolean, false),
    coalesce((p_payload->>'isNew')::boolean, false),
    coalesce((p_payload->>'sortOrder')::integer, 0),
    coalesce((p_payload->>'lowStockThreshold')::integer, 2),
    null
  )
  on conflict (id) do update set
    sku = excluded.sku,
    category_id = excluded.category_id,
    weight_grams = excluded.weight_grams,
    active = false,
    publication_status = 'draft',
    featured = excluded.featured,
    is_new = excluded.is_new,
    sort_order = excluded.sort_order,
    low_stock_threshold = excluded.low_stock_threshold,
    archived_at = null;

  foreach selected_locale in array array['cs', 'sk', 'en', 'de'] loop
    translation := p_payload->'translations'->selected_locale;
    insert into public.product_translations(
      product_id, locale, slug, name, short_description, long_description,
      material, color, dimensions, care, seo_title, seo_description
    ) values (
      target_product_id, selected_locale, translation->>'slug', translation->>'name',
      translation->>'shortDescription', translation->>'longDescription',
      translation->>'material', translation->>'color', translation->>'dimensions',
      translation->>'care', translation->>'seoTitle', translation->>'seoDescription'
    )
    on conflict (product_id, locale) do update set
      slug = excluded.slug,
      name = excluded.name,
      short_description = excluded.short_description,
      long_description = excluded.long_description,
      material = excluded.material,
      color = excluded.color,
      dimensions = excluded.dimensions,
      care = excluded.care,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description;
  end loop;

  foreach selected_currency in array array['CZK', 'EUR'] loop
    price_data := p_payload->'prices'->selected_currency;
    insert into public.product_prices(product_id, currency, amount_minor, original_amount_minor)
    values (
      target_product_id,
      selected_currency,
      (price_data->>'amountMinor')::integer,
      nullif(price_data->>'originalAmountMinor', '')::integer
    )
    on conflict (product_id, currency) do update set
      amount_minor = excluded.amount_minor,
      original_amount_minor = excluded.original_amount_minor;
  end loop;

  insert into public.inventory_items(product_id, variant_id, quantity)
  values (target_product_id, null, (p_payload->>'stockQuantity')::integer)
  on conflict (product_id) where variant_id is null do update set quantity = excluded.quantity;

  if target_status = 'active' then
    publish_issues := public.admin_product_publish_issues(target_product_id);
    if cardinality(publish_issues) > 0 then
      raise exception 'product_publish_incomplete:%', array_to_string(publish_issues, ',');
    end if;
  end if;

  update public.products
  set publication_status = target_status,
      active = target_status = 'active',
      archived_at = case when target_status = 'archived' then coalesce(archived_at, now()) else null end
  where id = target_product_id;

  return target_product_id;
end;
$$;

revoke all on function public.admin_upsert_product(uuid, jsonb) from public;
grant execute on function public.admin_upsert_product(uuid, jsonb) to authenticated;

commit;
