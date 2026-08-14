# První skutečný testovací produkt přes `/admin`

Tento postup se provádí až po schváleném spuštění baseline na prázdném vývojovém Supabase a vytvoření admin účtu.

1. Otevřít `https://test.amaree.cz/admin/login` a přihlásit se individuálním admin účtem.
2. V `Produkty` zvolit `Nový produkt`.
3. Vyplnit český název; administrace automaticky navrhne unikátní SKU a slug. Interní ID vytvoří databáze.
4. V záložkách doplnit popis, materiál, barvu, rozměry, péči a SEO. EN a DE lze dočasně ponechat prázdné.
5. Vyplnit cenu CZK a EUR včetně případné vyšší původní ceny. Nepoužívá se automatický měnový přepočet.
6. Ve stejné editaci nahrát vlastní JPG/PNG/WebP fotografie: 800–12 000 px na každé straně, nejvýše 12 MB. Doplnit ALT, určit hlavní fotografii a pořadí.
7. Uložit produkt ve stavu `Koncept`.
8. Zkontrolovat údaje a přepnout stav na `Aktivní`. Editor i databáze přesně vypíší případné chybějící podklady.
9. Ověřit detail produktu, košík, checkout, skladovou rezervaci a zobrazení objednávky v administraci.
10. GoPay, Packeta a Resend zapínat po jednom až po doplnění testovacích údajů a podle jejich integračních checklistů. Ecomail je pouze budoucí newsletter.

Importní JSON zůstává pomocná datová šablona, ale běžná správa produktů od této fáze probíhá výhradně přes `/admin`.
