insert into public.categories (slug, name, description)
values
  ('earrings', '{"cs":"Náušnice","en":"Earrings","de":"Ohrringe"}', '{"cs":"Jemné náušnice pro každodenní eleganci.","en":"Delicate earrings for everyday elegance.","de":"Feine Ohrringe für den Alltag."}'),
  ('necklaces', '{"cs":"Náhrdelníky","en":"Necklaces","de":"Halsketten"}', '{"cs":"Nadčasové náhrdelníky.","en":"Timeless necklaces.","de":"Zeitlose Halsketten."}'),
  ('bracelets', '{"cs":"Náramky","en":"Bracelets","de":"Armbänder"}', '{"cs":"Minimalistické náramky.","en":"Minimal bracelets.","de":"Minimalistische Armbänder."}')
on conflict (slug) do nothing;

insert into public.discount_codes (code, discount_type, value, minimum_order_value, usage_limit)
values ('AMAREE10', 'percent', 10, 100000, 100)
on conflict (code) do nothing;
