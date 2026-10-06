# Puncovní a materiálové údaje

Funkce je připravená migrací `supabase/migrations/202607210001_hallmark_compliance.sql`. Migrace se nespouští automaticky; před nasazením kódu musí projít vývojovým Supabase a zálohou stejně jako ostatní doplňkové migrace.

## Globální nastavení

Správce používá `Nastavení → Právní údaje → Puncovní informace`. Veřejná stránka `/cs/puncovni-informace` vrací 404 a patička nezobrazuje odkaz, dokud současně neplatí:

- e-shop obchoduje s výrobky z drahých kovů,
- je doplněný smysluplný veřejný text,
- při uvedené registraci existuje registrační poznámka nebo odkaz,
- správce výslovně zapnul veřejnou stránku.

Odkaz v patičce má vlastní přepínač. Vyobrazení značek a volitelné veřejné PDF jsou v bucketu `public-compliance-assets`. Dokument není povinný.

Výchozí veřejné vyobrazení současných českých puncovních značek je uloženo v `public/legal/czech-hallmarks-current.jpg`. Soubor pochází z [oficiálního přehledu Puncovního úřadu](https://punc.gov.cz/puncovni-znacky-cz-soucasne/), který odkazuje na aktuální přílohu v e-Sbírce. Pokud správce nahraje vlastní vyobrazení v administraci, má nahraný soubor přednost. Veřejná stránka vždy obsahuje odkaz na oficiální zdroj.

Registrační dokument doručený provozovateli se veřejně nenahrává. Na web patří pouze veřejné identifikační údaje, registrační číslo, datum registrace a odkaz na seznam registrovaných subjektů.

## Produkty a dokumenty

Materiálové údaje jsou v tabulce `product_material_compliance`. Dodavatelské doklady a produktové certifikáty jsou v neveřejném bucketu `private-compliance-documents`; přístup vyžaduje platnou administrátorskou relaci.

AI pomocník puncovní pole nečte ani nezapisuje a jeho výstup s puncem, ryzostí nebo tvrzením o Puncovním úřadu server odmítne. Veřejný detail ukáže ověřené materiálové údaje až po globálním zapnutí puncovní stránky. Neověřený produkt s chráněným tvrzením nelze aktivovat a katalog jej bezpečně vynechá.
