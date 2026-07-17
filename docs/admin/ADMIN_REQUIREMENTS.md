# Administrace AMARÉE

Tento dokument kombinuje cílový rozsah s aktuální implementací. Produktový CRUD, Storage, objednávky, stavové e-maily a Packeta akce jsou napojené na připravené Supabase schéma, ale nezačnou trvale zapisovat, dokud nebude baseline se souhlasem spuštěna ve vývojovém projektu.

## Umístění a přístup

- Administrace poběží ve stejné aplikaci na `https://amaree.cz/admin`.
- Nepřihlášený návštěvník bude přesměrován na `/admin/login` a neuvidí žádná administrační data.
- Přihlášení bude používat Supabase Auth s individuálními účty, nikoli jedno sdílené heslo.
- Veřejná registrace bude vypnutá. Administrátory bude možné založit pouze pozvánkou nebo bezpečným serverovým procesem.
- Oprávnění budou vycházet z tabulky `admin_users`, serverové kontroly relace a Row Level Security.
- Produkční varianta má podporovat vícefaktorové ověření, bezpečné obnovení přístupu, odhlášení všech relací a audit citlivých změn.
- Service role klíče, hesla integrací a další tajné hodnoty nesmí být dostupné v prohlížeči ani uložené v repozitáři.

## Vizuální a uživatelský směr

Inspirace administračními systémy se přebírá funkčně, ne vzhledem. AMARÉE bude mít moderní, klidné a pracovní rozhraní:

- stálou postranní navigaci na desktopu a kompaktní menu na mobilu,
- husté a dobře skenovatelné tabulky místo dekorativních karet,
- globální hledání, filtry, řazení, stránkování a uložené pohledy,
- stavové štítky, jasná primární tlačítka a ikony Lucide,
- formuláře rozdělené do logických sekcí s průběžným uložením konceptu,
- potvrzení nevratných operací a viditelnou informaci o neuložených změnách,
- použitelnost primárně na desktopu, ale bez rozbití základních úkonů na mobilu.

## Hlavní navigace

1. **Přehled** - nové objednávky, nízký sklad, obrat, nevyřízené reklamace a stav integrací.
2. **Produkty** - katalog, kategorie, varianty, fotografie, ceny, sklad a SEO.
3. **Objednávky** - hledání, filtry, detail, platba, doprava, dokumenty a historie stavů.
4. **Sklad** - pohyby, rezervace, nízké zásoby a ruční korekce s auditem.
5. **Slevy** - slevové kódy, platnost, limity, minimální hodnota a využití.
6. **Zákazníci** - objednávková historie a kontaktní údaje pouze v oprávněném rozsahu.
7. **Obsah** - vybrané texty webu, právní stránky a newsletterové formuláře.
8. **Odběratelé** - evidence souhlasu, stav synchronizace s Ecomailem a odhlášení.
9. **Nastavení** - doprava, platby, e-maily, firemní údaje, uživatelé a role.
10. **Audit** - kdo, kdy a co změnil u produktů, skladu, objednávek a oprávnění.

## Správa produktů

Editor produktu musí podporovat:

- SKU a případná SKU variant,
- název, slug, krátký a dlouhý popis v CS/EN/DE,
- kategorii, stav koncept/aktivní/archivovaný a příznaky doporučený/novinka,
- cenu CZK a EUR, původní cenu, daňové nastavení a časově omezenou cenu,
- sklad produktu nebo jednotlivých variant a upozornění na nízkou zásobu,
- materiál, barvu, rozměry, hmotnost a péči o šperk,
- varianty produktu a jejich pořadí,
- hlavní a doplňkové fotografie, změnu pořadí přetažením a ALT texty CS/EN/DE,
- SEO title, SEO description a náhled výsledku vyhledávání,
- náhled produktu před publikací,
- deaktivaci místo mazání produktu, který už figuruje v objednávce.

## Správa objednávek

Seznam objednávek musí umožnit hledat podle čísla objednávky, zákazníka, e-mailu, telefonu, platební reference a zásilky. Filtry budou zahrnovat období, stav, platební metodu, dopravu a zemi.

Doporučené stavové skupiny:

- nová / čeká na platbu,
- zaplacená / připravuje se,
- připravená k osobnímu odběru,
- předaná dopravci,
- doručená / dokončená,
- zrušená,
- vrácená nebo reklamovaná,
- archivovaná.

Detail objednávky musí zobrazit položky a historické ceny, zákazníka, fakturační a doručovací údaje, stav platby GoPay, stav a číslo zásilky Packeta, skladové rezervace, interní poznámky a časovou osu událostí. Ruční změna platby, skladu nebo stavu musí vyžadovat potvrzení a vytvořit auditní záznam.

Automatické a ruční zákaznické zprávy, tracking, e-mailová fronta a mapování stavů jsou závazně popsány v `docs/commerce/ORDER_NOTIFICATIONS.md`.

## Bezpečnost a ochrana dat

- Všechna administrační data se načítají a mění přes serverovou autorizaci.
- RLS musí zabránit anonymnímu čtení objednávek, zákazníků, rezervací, auditů a neveřejných produktů.
- Role minimálně: vlastník, správce katalogu a správce objednávek. Každá má jen nutná oprávnění.
- Přihlašování a citlivé operace budou omezené proti opakovaným pokusům a zaznamenané.
- Osobní údaje se nezobrazují ve výpisech více, než je potřeba, a exporty se auditují.
- Zálohování a obnova databáze se ověří před produkčním spuštěním.

## Pořadí realizace

1. Dokončit a otestovat databázové schéma, role a RLS ve vývojovém Supabase projektu.
2. Nahradit demonstrační přístup skutečným Supabase Auth a chráněnými serverovými relacemi.
3. Dokončit správu produktů, fotografií a skladu nad vývojovou databází.
4. Připojit objednávky, platby, Packetu, historii stavů a audit.
5. Doplnit slevy, odběratele, obsah a provozní nastavení.
6. Provést bezpečnostní, funkční a mobilní QA a teprve potom povolit `/admin` v produkci.

## Produkční kritéria

Administrace není produkční, dokud nefunguje skutečné přihlášení, serverová autorizace, RLS, trvalé ukládání, audit citlivých změn, zálohování a otestovaná obnova. Samotná existence obrazovek pod `/admin` se za zabezpečenou administraci nepovažuje.
