begin;

create table if not exists public.product_slug_aliases (
  product_id uuid not null references public.products(id) on delete cascade,
  locale text not null check (locale in ('cs', 'sk', 'en', 'de')),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  primary key (locale, slug)
);

create index if not exists product_slug_aliases_product_idx
  on public.product_slug_aliases(product_id);

alter table public.product_slug_aliases enable row level security;

drop policy if exists public_product_slug_aliases_read on public.product_slug_aliases;
create policy public_product_slug_aliases_read
  on public.product_slug_aliases
  for select
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_slug_aliases.product_id
        and p.active = true
        and p.archived_at is null
    )
  );

drop policy if exists catalog_admin_product_slug_aliases on public.product_slug_aliases;
create policy catalog_admin_product_slug_aliases
  on public.product_slug_aliases
  for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

grant select on public.product_slug_aliases to anon, authenticated;
grant insert, update, delete on public.product_slug_aliases to authenticated;

insert into public.product_slug_aliases(product_id, locale, slug)
select pt.product_id, pt.locale, pt.slug
from public.product_translations pt
join public.products p on p.id = pt.product_id
where p.sku in ('1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009')
on conflict (locale, slug) do nothing;

with renamed(sku, locale, name, slug) as (
  values
    ('1001', 'cs', 'AMARÉE Rosé náramek', 'amaree-rose-naramek'),
    ('1001', 'sk', 'AMARÉE Rosé náramok', 'amaree-rose-naramok'),
    ('1001', 'en', 'AMARÉE Rosé Bracelet', 'amaree-rose-bracelet'),
    ('1001', 'de', 'AMARÉE Rosé Armband', 'amaree-rose-armband'),
    ('1002', 'cs', 'AMARÉE Rosé náhrdelník', 'amaree-rose-nahrdelnik'),
    ('1002', 'sk', 'AMARÉE Rosé náhrdelník', 'amaree-rose-nahrdelnik'),
    ('1002', 'en', 'AMARÉE Rosé Necklace', 'amaree-rose-necklace'),
    ('1002', 'de', 'AMARÉE Rosé Halskette', 'amaree-rose-halskette'),
    ('1003', 'cs', 'AMARÉE Noir náhrdelník', 'amaree-noir-nahrdelnik'),
    ('1003', 'sk', 'AMARÉE Noir náhrdelník', 'amaree-noir-nahrdelnik'),
    ('1003', 'en', 'AMARÉE Noir Necklace', 'amaree-noir-necklace'),
    ('1003', 'de', 'AMARÉE Noir Halskette', 'amaree-noir-halskette'),
    ('1004', 'cs', 'AMARÉE Noir náramek', 'amaree-noir-naramek'),
    ('1004', 'sk', 'AMARÉE Noir náramok', 'amaree-noir-naramok'),
    ('1004', 'en', 'AMARÉE Noir Bracelet', 'amaree-noir-bracelet'),
    ('1004', 'de', 'AMARÉE Noir Armband', 'amaree-noir-armband'),
    ('1005', 'cs', 'AMARÉE Halo stříbrný náramek', 'amaree-halo-stribrny-naramek'),
    ('1005', 'sk', 'AMARÉE Halo strieborný náramok', 'amaree-halo-strieborny-naramok'),
    ('1005', 'en', 'AMARÉE Halo Silver Bracelet', 'amaree-halo-silver-bracelet'),
    ('1005', 'de', 'AMARÉE Halo Armband Silber', 'amaree-halo-armband-silber'),
    ('1006', 'cs', 'AMARÉE Rosé náušnice', 'amaree-rose-nausnice'),
    ('1006', 'sk', 'AMARÉE Rosé náušnice', 'amaree-rose-nausnice'),
    ('1006', 'en', 'AMARÉE Rosé Earrings', 'amaree-rose-earrings'),
    ('1006', 'de', 'AMARÉE Rosé Ohrringe', 'amaree-rose-ohrringe'),
    ('1007', 'cs', 'AMARÉE Noir náušnice', 'amaree-noir-nausnice'),
    ('1007', 'sk', 'AMARÉE Noir náušnice', 'amaree-noir-nausnice'),
    ('1007', 'en', 'AMARÉE Noir Earrings', 'amaree-noir-earrings'),
    ('1007', 'de', 'AMARÉE Noir Ohrringe', 'amaree-noir-ohrringe'),
    ('1008', 'cs', 'AMARÉE Halo kruhové náušnice stříbrné', 'amaree-halo-kruhove-nausnice-stribrne'),
    ('1008', 'sk', 'AMARÉE Halo kruhové náušnice strieborné', 'amaree-halo-kruhove-nausnice-strieborne'),
    ('1008', 'en', 'AMARÉE Halo Silver Hoop Earrings', 'amaree-halo-silver-hoop-earrings'),
    ('1008', 'de', 'AMARÉE Halo Creolen Silber', 'amaree-halo-creolen-silber'),
    ('1009', 'cs', 'AMARÉE Halo kruhové náušnice pozlacené', 'amaree-halo-kruhove-nausnice-pozlacene'),
    ('1009', 'sk', 'AMARÉE Halo kruhové náušnice pozlátené', 'amaree-halo-kruhove-nausnice-pozlatene'),
    ('1009', 'en', 'AMARÉE Halo Gold-Plated Hoop Earrings', 'amaree-halo-gold-plated-hoop-earrings'),
    ('1009', 'de', 'AMARÉE Halo Vergoldete Creolen', 'amaree-halo-vergoldete-creolen')
)
update public.product_translations pt
set name = renamed.name,
    slug = renamed.slug,
    seo_title = renamed.name || ' | AMARÉE'
from public.products p, renamed
where pt.product_id = p.id
  and p.sku = renamed.sku
  and pt.locale = renamed.locale;

with series(sku, old_name, temporary_name, new_name) as (
  values
    ('1001', 'Lumière Clover', 'Anette Rosé', 'AMARÉE Rosé'),
    ('1002', 'Lumière Clover', 'Anette Rosé', 'AMARÉE Rosé'),
    ('1003', 'Lumière Clover', 'Anette Noir', 'AMARÉE Noir'),
    ('1004', 'Lumière Clover', 'Anette Noir', 'AMARÉE Noir'),
    ('1005', 'Éclat', 'Anette Ligne', 'AMARÉE Halo'),
    ('1006', 'Lumière Clover', 'Anette Rosé', 'AMARÉE Rosé'),
    ('1007', 'Lumière Clover', 'Anette Noir', 'AMARÉE Noir'),
    ('1008', 'Éclat', 'Anette Ligne', 'AMARÉE Halo'),
    ('1009', 'Éclat', 'Anette Ligne', 'AMARÉE Halo')
)
update public.product_translations pt
set short_description = replace(replace(pt.short_description, series.old_name, series.new_name), series.temporary_name, series.new_name),
    long_description = replace(replace(pt.long_description, series.old_name, series.new_name), series.temporary_name, series.new_name),
    seo_description = replace(replace(pt.seo_description, series.old_name, series.new_name), series.temporary_name, series.new_name)
from public.products p, series
where pt.product_id = p.id
  and p.sku = series.sku;

with series(sku, old_name, temporary_name, new_name) as (
  values
    ('1001', 'Lumière Clover', 'Anette Rosé', 'AMARÉE Rosé'),
    ('1002', 'Lumière Clover', 'Anette Rosé', 'AMARÉE Rosé'),
    ('1003', 'Lumière Clover', 'Anette Noir', 'AMARÉE Noir'),
    ('1004', 'Lumière Clover', 'Anette Noir', 'AMARÉE Noir'),
    ('1005', 'Éclat', 'Anette Ligne', 'AMARÉE Halo'),
    ('1006', 'Lumière Clover', 'Anette Rosé', 'AMARÉE Rosé'),
    ('1007', 'Lumière Clover', 'Anette Noir', 'AMARÉE Noir'),
    ('1008', 'Éclat', 'Anette Ligne', 'AMARÉE Halo'),
    ('1009', 'Éclat', 'Anette Ligne', 'AMARÉE Halo')
)
update public.product_image_translations pit
set alt_text = replace(replace(pit.alt_text, series.old_name, series.new_name), series.temporary_name, series.new_name)
from public.product_images pi
join public.products p on p.id = pi.product_id
join series on series.sku = p.sku
where pit.image_id = pi.id;

commit;
