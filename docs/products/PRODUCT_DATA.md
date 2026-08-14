# Produktová data AMARÉE

Soubor `data/products.import.json` je pracovní importní šablona a současně obsahuje jeden úplně vyplněný demonstrační záznam. Ukázka je záměrně `active: false` a nesmí být považována za skutečný produkt.

## Jak předávat produkty

1. Pro každý produkt pošlete údaje ze seznamu níže a originální fotografie v nejvyšší dostupné kvalitě.
2. Jeden produkt lze doplnit a ověřit samostatně; není nutné čekat na celý katalog.
3. Nový záznam zkopírujte v JSON poli v `data/products.import.json` a zachovejte názvy polí.
4. Dokud nejsou schválené texty, ceny a fotografie, ponechte `active: false`.
5. Před importem spusťte `npm run products:validate`. Validátor kontroluje strukturu, lokalizace, ceny, obrázky, varianty a duplicity napříč celým souborem.

## Údaje pro jeden produkt

- interní ID, SKU a kategorie,
- název, samostatný slug, krátký popis, dlouhý popis a péče v CS/EN/DE,
- prodejní a případná původní cena v CZK i EUR,
- sklad, materiál, barva, rozměry a hmotnost v gramech,
- hlavní fotografie a další fotografie ve správném pořadí,
- ALT text každé fotografie v CS/EN/DE,
- SEO title a SEO description v CS/EN/DE,
- rozhodnutí `active`, `featured` a `isNew`,
- případné varianty včetně jejich SKU, názvu, skladu a případných odlišných cen či parametrů.

## Jednotky a pravidla

| Pole | Pravidlo |
| --- | --- |
| `internalId` | unikátní, malá písmena, čísla a pomlčky |
| `name`, popisy, materiál, barva, rozměry, péče | neprázdné hodnoty pro CS, EN a DE |
| `slug` | unikátní napříč importem, bez diakritiky a mezer, samostatný pro CS/EN/DE |
| `sku` | unikátní napříč produkty i variantami, velká písmena, čísla a pomlčky |
| `category` | `earrings`, `necklaces` nebo `bracelets` |
| `priceCzkMinor` | celé haléře; 1 490 Kč se zapisuje jako `149000` |
| `priceEurMinor` | celé eurocenty; 59,90 EUR se zapisuje jako `5990` |
| původní ceny | `null`, nebo částka vyšší než aktuální cena ve stejné měně |
| `stockQuantity` | nezáporné celé číslo; u variant se rovná součtu jejich skladů |
| `weightGrams` | kladná hodnota v gramech |
| `mainImage` | cesta, ALT v CS/EN/DE a `sortOrder: 0` |
| `additionalImages` | unikátní cesty a neopakující se kladné `sortOrder` |
| `variants` | prázdné pole, nebo unikátní `variantId` a SKU; ceny se přepisují vždy v obou měnách |
| SEO | neprázdný title a description pro všechny jazyky |

Volitelně lze ověřit jiný soubor:

```bash
npm run products:validate -- cesta/k/souboru.json
```

## Audit současných demo produktů

Současné produkty v `src/lib/products.ts` se nemažou. Luna, Sera i Aura mají demo názvy, tříjazyčné základní popisy, CZK cenu, sklad, materiál, rozměry, péči a externí obrázky. Pro skutečný katalog u všech chybí nebo není potvrzeno:

- finální interní ID, SKU, názvy, kategorie, CZK ceny a sklad,
- EUR cena a případná původní EUR cena,
- samostatné slugy pro CS, EN a DE,
- finální krátké a dlouhé popisy ve všech jazycích,
- barva, hmotnost, SEO title a SEO description,
- příznak novinky a rozhodnutí, zda produkt má varianty,
- fotografie v úložišti vlastněném AMARÉE, práva k jejich použití a finální ALT texty,
- finální rozhodnutí o příznacích aktivní a doporučený.

### Luna náušnice

- Původní CZK cena je vyplněná, ale není potvrzená.
- Produkt je v kódu aktivní, doporučený a bestseller, což je pouze demonstrační nastavení.
- Dlouhý popis výslovně označuje produkt jako demonstrační.

### Sera náhrdelník

- Nemá původní cenu; je třeba potvrdit, zda vůbec má být prezentován ve slevě.
- Produkt je v kódu aktivní a doporučený pouze pro demonstraci katalogu.
- Dlouhý popis výslovně označuje produkt jako demonstrační.

### Aura náramek

- Nemá původní cenu; je třeba potvrdit, zda vůbec má být prezentován ve slevě.
- Produkt je v kódu aktivní a bestseller pouze pro demonstraci katalogu.
- Dlouhý popis výslovně označuje produkt jako demonstrační.
