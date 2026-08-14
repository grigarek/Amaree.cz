begin;

-- Keep every currently published URL working after the catalogue is renamed.
insert into public.product_slug_aliases(product_id, locale, slug)
select pt.product_id, pt.locale, pt.slug
from public.product_translations pt
join public.products p on p.id = pt.product_id
where p.sku in ('1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009')
on conflict (locale, slug) do nothing;

with renamed(sku, locale, name, slug) as (
  values
    ('1001', 'cs', 'Rosée náramek', 'rosee-naramek'),
    ('1001', 'sk', 'Rosée náramok', 'rosee-naramok'),
    ('1001', 'en', 'Rosée Bracelet', 'rosee-bracelet'),
    ('1001', 'de', 'Rosée Armband', 'rosee-armband'),
    ('1002', 'cs', 'Rosée náhrdelník', 'rosee-nahrdelnik'),
    ('1002', 'sk', 'Rosée náhrdelník', 'rosee-nahrdelnik'),
    ('1002', 'en', 'Rosée Necklace', 'rosee-necklace'),
    ('1002', 'de', 'Rosée Halskette', 'rosee-halskette'),
    ('1003', 'cs', 'Minuit náhrdelník', 'minuit-nahrdelnik'),
    ('1003', 'sk', 'Minuit náhrdelník', 'minuit-nahrdelnik'),
    ('1003', 'en', 'Minuit Necklace', 'minuit-necklace'),
    ('1003', 'de', 'Minuit Halskette', 'minuit-halskette'),
    ('1004', 'cs', 'Minuit náramek', 'minuit-naramek'),
    ('1004', 'sk', 'Minuit náramok', 'minuit-naramok'),
    ('1004', 'en', 'Minuit Bracelet', 'minuit-bracelet'),
    ('1004', 'de', 'Minuit Armband', 'minuit-armband'),
    ('1005', 'cs', 'Lueur stříbrný náramek', 'lueur-stribrny-naramek'),
    ('1005', 'sk', 'Lueur strieborný náramok', 'lueur-strieborny-naramok'),
    ('1005', 'en', 'Lueur Silver Bracelet', 'lueur-silver-bracelet'),
    ('1005', 'de', 'Lueur Armband Silber', 'lueur-armband-silber'),
    ('1006', 'cs', 'Rosée náušnice', 'rosee-nausnice'),
    ('1006', 'sk', 'Rosée náušnice', 'rosee-nausnice'),
    ('1006', 'en', 'Rosée Earrings', 'rosee-earrings'),
    ('1006', 'de', 'Rosée Ohrringe', 'rosee-ohrringe'),
    ('1007', 'cs', 'Minuit náušnice', 'minuit-nausnice'),
    ('1007', 'sk', 'Minuit náušnice', 'minuit-nausnice'),
    ('1007', 'en', 'Minuit Earrings', 'minuit-earrings'),
    ('1007', 'de', 'Minuit Ohrringe', 'minuit-ohrringe'),
    ('1008', 'cs', 'Lueur kruhové náušnice stříbrné', 'lueur-kruhove-nausnice-stribrne'),
    ('1008', 'sk', 'Lueur kruhové náušnice strieborné', 'lueur-kruhove-nausnice-strieborne'),
    ('1008', 'en', 'Lueur Silver Hoop Earrings', 'lueur-silver-hoop-earrings'),
    ('1008', 'de', 'Lueur Creolen Silber', 'lueur-creolen-silber'),
    ('1009', 'cs', 'Lueur kruhové náušnice pozlacené', 'lueur-kruhove-nausnice-pozlacene'),
    ('1009', 'sk', 'Lueur kruhové náušnice pozlátené', 'lueur-kruhove-nausnice-pozlatene'),
    ('1009', 'en', 'Lueur Gold-Plated Hoop Earrings', 'lueur-gold-plated-hoop-earrings'),
    ('1009', 'de', 'Lueur Vergoldete Creolen', 'lueur-vergoldete-creolen')
)
update public.product_translations pt
set name = renamed.name,
    slug = renamed.slug,
    seo_title = renamed.name || ' | AMARÉE'
from public.products p, renamed
where pt.product_id = p.id
  and p.sku = renamed.sku
  and pt.locale = renamed.locale;

with series(sku, old_name, new_name) as (
  values
    ('1001', 'AMARÉE Rosé', 'Rosée'),
    ('1002', 'AMARÉE Rosé', 'Rosée'),
    ('1003', 'AMARÉE Noir', 'Minuit'),
    ('1004', 'AMARÉE Noir', 'Minuit'),
    ('1005', 'AMARÉE Halo', 'Lueur'),
    ('1006', 'AMARÉE Rosé', 'Rosée'),
    ('1007', 'AMARÉE Noir', 'Minuit'),
    ('1008', 'AMARÉE Halo', 'Lueur'),
    ('1009', 'AMARÉE Halo', 'Lueur')
)
update public.product_translations pt
set short_description = replace(pt.short_description, series.old_name, series.new_name),
    long_description = replace(pt.long_description, series.old_name, series.new_name),
    seo_description = replace(pt.seo_description, series.old_name, series.new_name)
from public.products p, series
where pt.product_id = p.id
  and p.sku = series.sku;

with series(sku, old_name, new_name) as (
  values
    ('1001', 'AMARÉE Rosé', 'Rosée'),
    ('1002', 'AMARÉE Rosé', 'Rosée'),
    ('1003', 'AMARÉE Noir', 'Minuit'),
    ('1004', 'AMARÉE Noir', 'Minuit'),
    ('1005', 'AMARÉE Halo', 'Lueur'),
    ('1006', 'AMARÉE Rosé', 'Rosée'),
    ('1007', 'AMARÉE Noir', 'Minuit'),
    ('1008', 'AMARÉE Halo', 'Lueur'),
    ('1009', 'AMARÉE Halo', 'Lueur')
)
update public.product_image_translations pit
set alt_text = replace(pit.alt_text, series.old_name, series.new_name)
from public.product_images pi
join public.products p on p.id = pi.product_id
join series on series.sku = p.sku
where pit.image_id = pi.id;

commit;
