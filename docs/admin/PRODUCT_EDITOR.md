# Editor produktů

## Běžný postup

1. V `/admin/products` zvolit `Vytvořit produkt`.
2. Vyplnit český název. Administrace navrhne unikátní SKU, slug a základní SEO.
3. Projít záložky `Popis`, `Fotografie`, `Cena a sklad`, `SEO` a `Parametry`.
4. Fotografie přetáhnout do editoru a pořadí změnit tažením nebo šipkami. První fotografie je hlavní.
5. V `Publikování` ponechat `Koncept`, dokud není produkt připravený.
6. Přepnout na `Aktivní`. Administrace publikaci odmítne, pokud chybí název, slug, kladná cena CZK, skladové pole nebo hlavní fotografie.

Interní databázové ID vytváří PostgreSQL. Při založení se nezobrazuje; v detailu je pouze technický údaj pro podporu. SKU i slug lze ručně změnit, ale databáze nepovolí duplicitu.

## Ukládání a bezpečnost

- `Ctrl+S` nebo `Cmd+S` produkt uloží.
- Rozpracovaný nový produkt se automaticky ukládá do tohoto prohlížeče.
- Platný již existující produkt se po krátké prodlevě automaticky ukládá do Supabase.
- Při opuštění stránky s neuloženými změnami se zobrazí potvrzení.
- Veřejný katalog čte pouze produkty ve stavu `Aktivní`.
- `Skrytý` produkt není veřejný, ale zůstává běžně dostupný v administraci. `Archivovaný` je určen pro dlouhodobě vyřazené zboží.

## Volitelný AI pomocník

Záložka `AI pomocník` připravuje pouze české návrhy. Administrátor zvolí pole, doplní vlastní pokyny a ručně spustí generování. Před vložením se vždy zobrazí současná hodnota vedle editovatelného návrhu; každé pole lze zvlášť přijmout nebo ponechat. Vložení návrhu produkt neuloží ani nepublikuje.

- Výchozí volby jsou krátký a dlouhý popis, SEO title, SEO description a ALT texty.
- Prázdný název, SKU nebo slug lze doplnit; server a databáze následně ověří jedinečnost SKU a slugu.
- Do jednoho požadavku jde nejvýše pět fotografií. Prohlížeč je před odesláním převádí na zmenšený JPEG.
- AI smí z fotografií popsat jen viditelný vzhled. Materiál, ryzost, kameny, rozměry a podobná fakta musí být potvrzená v administraci.
- Sekce `Parametry → Materiál a puncovní údaje` ukládá ověřovaná fakta odděleně od marketingového obsahu. Dodavatelské doklady a certifikáty produktu jsou v neveřejném Storage bucketu a AI k nim ani k puncovním polím nemá přístup.
- Chráněná tvrzení o českém puncu, Puncovním úřadu nebo konkrétní ryzosti nelze zveřejnit bez ručního potvrzení `Údaje byly ověřeny podle dokumentace`. Databáze i katalog tuto podmínku kontrolují nezávisle.
- Provozní log obsahuje jen čas, administrátora, produkt, stav, model, tokeny a použitá pole. Neobsahuje fotografie, prompt ani vygenerovaný obsah.
- Limit je 5 požadavků za 15 minut a 30 za 24 hodin na administrátora.
- Funkce vyžaduje migraci `202607200002_product_ai_assistant.sql`, serverový secret `OPENAI_API_KEY` a `AI_PRODUCT_ASSISTANT_ENABLED=true`.

## Připravenost na rozšíření

Současný model už odděluje základ produktu, překlady, ceny, sklad, varianty a fotografie. Další funkce se mají přidávat jako navazující tabulky a administrační moduly, nikoli přepisem produktu:

- **Varianty:** `product_variants` a sklad navázaný na `variant_id`; editor variant se doplní jako samostatná část záložky Parametry.
- **Více měn:** `product_prices` má samostatný řádek pro každou měnu; přibude konfigurovatelný seznam měn a pravidla zaokrouhlení.
- **Více jazyků:** překladové tabulky používají sloupec `locale`; přibude konfigurovatelný seznam publikovaných jazyků.
- **Množstevní slevy:** nová tabulka pravidel s vazbou na produkt nebo variantu, minimálním množstvím a dobou platnosti.
- **Dárkové poukazy:** samostatná entita poukazu a účetní kniha čerpání; nesmí se modelovat jako běžná skladová zásoba.
- **Personalizace:** definice volitelných polí produktu a hodnoty uložené do položky objednávky jako neměnný snapshot.

Tyto funkce zatím nejsou součástí editoru ani veřejného nákupu.
