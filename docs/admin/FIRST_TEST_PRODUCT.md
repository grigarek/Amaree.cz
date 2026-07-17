# První skutečný testovací produkt přes `/admin`

Tento postup se provádí až po schváleném spuštění baseline na prázdném vývojovém Supabase a vytvoření admin účtu.

1. Otevřít `https://test.amaree.cz/admin/login` a přihlásit se individuálním admin účtem.
2. V `Produkty` zvolit `Nový produkt`.
3. Vyplnit interní ID, unikátní SKU, kategorii, hmotnost, sklad, hranici nízkého skladu a pořadí.
4. Vyplnit název, unikátní slug, krátký/dlouhý popis, materiál, barvu, rozměry, péči a SEO pro CS, EN i DE.
5. Vyplnit cenu CZK a EUR včetně případné vyšší původní ceny. Nepoužívá se automatický měnový přepočet.
6. Uložit produkt jako neaktivní koncept.
7. Nahrát vlastní JPG/PNG/WebP fotografie: 800–12 000 px na každé straně, nejvýše 12 MB. Doplnit ALT CS/EN/DE, určit hlavní fotografii a pořadí.
8. Zkontrolovat veřejný náhled a teprve potom použít `Aktivovat`. Databáze aktivaci odmítne, pokud něco povinného chybí.
9. Ověřit detail produktu, košík, checkout, skladovou rezervaci a zobrazení objednávky v administraci.
10. GoPay, Packeta a Ecomail zapínat po jednom až po doplnění nových testovacích údajů a podle jejich integračních checklistů.

Importní JSON zůstává pomocná datová šablona, ale běžná správa produktů od této fáze probíhá výhradně přes `/admin`.
