begin;

-- Correct parameters that were previously copied from Czech into other locales.
update public.product_translations set dimensions = 'dĺžka 40–45 cm', clasp_type = 'Karabínkové zapínanie'
where product_id in ('3df48c57-d3e4-4fe5-ab9c-d1fad536a6d1', 'f3ce9474-f632-4332-aaf6-97f31dfa8c58') and locale = 'sk';
update public.product_translations set dimensions = 'length 40–45 cm', clasp_type = 'Lobster clasp'
where product_id in ('3df48c57-d3e4-4fe5-ab9c-d1fad536a6d1', 'f3ce9474-f632-4332-aaf6-97f31dfa8c58') and locale = 'en';
update public.product_translations set dimensions = 'Länge 40–45 cm', clasp_type = 'Karabinerverschluss'
where product_id in ('3df48c57-d3e4-4fe5-ab9c-d1fad536a6d1', 'f3ce9474-f632-4332-aaf6-97f31dfa8c58') and locale = 'de';

update public.product_translations set dimensions = replace(replace(dimensions, 'délka', 'dĺžka'), ' - ', '–'), clasp_type = 'Karabínkové zapínanie'
where product_id in ('c733aa2e-af1e-44ef-a952-efa0c3f0fdad', 'e73f4d05-e016-4955-9a28-e1be186d9359') and locale = 'sk';
update public.product_translations set dimensions = replace(replace(dimensions, 'délka', 'length'), ' - ', '–'), clasp_type = 'Lobster clasp'
where product_id in ('c733aa2e-af1e-44ef-a952-efa0c3f0fdad', 'e73f4d05-e016-4955-9a28-e1be186d9359') and locale = 'en';
update public.product_translations set dimensions = replace(replace(dimensions, 'délka', 'Länge'), ' - ', '–'), clasp_type = 'Karabinerverschluss'
where product_id in ('c733aa2e-af1e-44ef-a952-efa0c3f0fdad', 'e73f4d05-e016-4955-9a28-e1be186d9359') and locale = 'de';

update public.product_translations set clasp_type = 'Puzetové zapínanie'
where product_id in ('3b6780e3-31d0-4fce-a4b1-765a86f585b8', '9af2cfd5-d789-4c21-a5d1-3a6f85007c4d') and locale = 'sk';
update public.product_translations set clasp_type = 'Push-back fastening'
where product_id in ('3b6780e3-31d0-4fce-a4b1-765a86f585b8', '9af2cfd5-d789-4c21-a5d1-3a6f85007c4d') and locale = 'en';
update public.product_translations set clasp_type = 'Pousettenverschluss'
where product_id in ('3b6780e3-31d0-4fce-a4b1-765a86f585b8', '9af2cfd5-d789-4c21-a5d1-3a6f85007c4d') and locale = 'de';

update public.product_translations set clasp_type = 'Kĺbové zapínanie'
where product_id in ('481b5709-a541-4eda-972e-e8554f0626b6', 'fd240f5a-0e67-4235-8264-f792ea828698') and locale = 'sk';
update public.product_translations set clasp_type = 'Hinged closure'
where product_id in ('481b5709-a541-4eda-972e-e8554f0626b6', 'fd240f5a-0e67-4235-8264-f792ea828698') and locale = 'en';
update public.product_translations set clasp_type = 'Klappverschluss'
where product_id in ('481b5709-a541-4eda-972e-e8554f0626b6', 'fd240f5a-0e67-4235-8264-f792ea828698') and locale = 'de';

-- Complete the original test bracelet copy in every supported locale.
update public.product_translations set
  name = 'Lumière Clover náramok ružový',
  dimensions = 'dĺžka 17–20 cm', clasp_type = 'Karabínkové zapínanie',
  stones = 'Ružový dekor a číre kamienky'
where product_id = '7ee5c7f0-7f6c-4380-84a2-bf9adcb3dad3' and locale = 'sk';

update public.product_translations set
  slug = 'lumiere-clover-pink-bracelet', name = 'Lumière Clover Pink Bracelet',
  short_description = 'A delicate bracelet with a pink clover motif and clear stones for everyday elegance.',
  color = 'Silver and pink', dimensions = 'length 17–20 cm', clasp_type = 'Lobster clasp',
  stones = 'Pink decorative element and clear stones',
  care = 'Keep away from water, perfume and cosmetics. After wear, wipe gently with a soft dry cloth and store separately.',
  seo_title = 'Lumière Clover Pink Bracelet | AMARÉE',
  seo_description = 'A delicate bracelet with a pink clover motif and clear stones for everyday elegance.'
where product_id = '7ee5c7f0-7f6c-4380-84a2-bf9adcb3dad3' and locale = 'en';

update public.product_translations set
  slug = 'lumiere-clover-armband-rosa', name = 'Lumière Clover Armband Rosa',
  short_description = 'Feines Armband mit rosa Kleeblatt und klaren Steinen für elegante Alltagslooks.',
  color = 'Silber und Rosa', dimensions = 'Länge 17–20 cm', clasp_type = 'Karabinerverschluss',
  stones = 'Rosafarbenes Dekorelement und klare Schmucksteine',
  care = 'Vor Wasser, Parfüm und Kosmetik schützen. Nach dem Tragen sanft mit einem weichen trockenen Tuch abwischen und separat aufbewahren.',
  seo_title = 'Lumière Clover Armband Rosa | AMARÉE',
  seo_description = 'Feines Armband mit rosa Kleeblatt und klaren Steinen für elegante Alltagslooks.'
where product_id = '7ee5c7f0-7f6c-4380-84a2-bf9adcb3dad3' and locale = 'de';

update public.product_image_translations set alt_text = 'Lumière Clover pink bracelet on the wrist'
where image_id = 'dbe13dd9-c4b3-4062-9487-e432b3ca4c69' and locale = 'en';
update public.product_image_translations set alt_text = 'Lumière Clover Armband am Handgelenk'
where image_id = 'dbe13dd9-c4b3-4062-9487-e432b3ca4c69' and locale = 'de';
update public.product_image_translations set alt_text = 'Model wearing the Lumière Clover pink bracelet'
where image_id = '6c2fddad-b77c-4e40-b915-fcb1e0902055' and locale = 'en';
update public.product_image_translations set alt_text = 'Model mit rosa Lumière Clover Armband'
where image_id = '6c2fddad-b77c-4e40-b915-fcb1e0902055' and locale = 'de';

-- Remove misleading "silver tone" wording where the product is verified as silver.
update public.product_translations set
  long_description = replace(long_description, 'feine Kette im Silberton', 'feine Silberkette')
where locale = 'de' and product_id in ('3df48c57-d3e4-4fe5-ab9c-d1fad536a6d1', 'f3ce9474-f632-4332-aaf6-97f31dfa8c58');
update public.product_translations set
  long_description = replace(long_description, 'Motiv im Silberton', 'Motiv aus Silber')
where locale = 'de' and product_id = '9af2cfd5-d789-4c21-a5d1-3a6f85007c4d';
update public.product_translations set
  long_description = replace(long_description, 'feine Kette im Silberton', 'feine Silberkette')
where locale = 'de' and product_id = 'c733aa2e-af1e-44ef-a952-efa0c3f0fdad';
update public.product_translations set
  short_description = 'Zierliche Creolen aus vergoldetem Silber mit einer feinen Reihe klarer Steine.',
  long_description = replace(long_description, 'goldfarbenen Éclat Creolen', 'vergoldeten Éclat Creolen')
where locale = 'de' and product_id = '481b5709-a541-4eda-972e-e8554f0626b6';
update public.product_translations set
  short_description = 'Zierliche Creolen aus Silber mit einer feinen Reihe klarer Steine.',
  long_description = replace(long_description, 'silberfarbenen Éclat Creolen', 'Éclat Creolen aus Silber')
where locale = 'de' and product_id = 'fd240f5a-0e67-4235-8264-f792ea828698';
update public.product_translations set seo_description = 'Petite silver hoops finished with a neat row of clear stones.'
where locale = 'en' and product_id = 'fd240f5a-0e67-4235-8264-f792ea828698';

commit;
