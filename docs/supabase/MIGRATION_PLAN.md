# První vývojové spuštění Supabase

Migrace nebyla spuštěna. Aktivní adresář obsahuje jediný konsolidovaný baseline `202607170001_development_baseline.sql`; původní překrývající se návrhy jsou pouze v `docs/supabase/archive/`.

## Co baseline vytváří

- Auth vazbu `admin_users`, role `admin`/`editor`, login události a audit,
- kategorie, produkty, překlady CS/EN/DE, varianty, CZK/EUR ceny v minor units, sklad a pohyby skladu,
- produktové fotografie, lokalizované ALT a veřejný Storage bucket s chráněným zápisem,
- objednávky, položky, rezervace, platby, webhook události a historii stavů,
- Packeta body a zásilky, e-mailovou historii, slevy a reklamace,
- RLS a serverové RPC pro katalog, checkout, aktivaci produktu, GoPay a Packeta akce.

## Založení vývojového projektu

1. Vytvořit samostatný Supabase projekt `amaree-development` v evropském regionu. Produkční projekt zatím nezakládat nebo k němu nepřipojovat aplikaci.
2. V Auth vypnout veřejné registrace. Povolit pouze pozvánky administrátorem; nastavit Site URL na `https://test.amaree.cz` a povolené redirect URL pro staging.
3. Získat development Project URL, anon key a service role key. Service role uložit jen do lokálního `.env.local`, Cloudflare secrets a GitHub Actions secrets pro šifrovanou zálohu.
4. Před migrací ověřit, že projekt neobsahuje vlastní tabulky ani data. Spuštění baseline musí uživatel výslovně schválit.
5. Aplikovat baseline jednou na prázdný projekt. Nespouštět archivované migrace.
6. Pozvat prvního uživatele přes Supabase Auth a po přijetí pozvánky vložit jeho `auth.users.id` a e-mail do `public.admin_users` s rolí `admin`.
7. Ověřit anon, nepovoleného authenticated uživatele, editora a admina. Editor smí katalog, ale nesmí objednávky, zásilky, platby ani audit.
8. Projít test jednoho produktu a objednávky podle `docs/admin/FIRST_TEST_PRODUCT.md`.

## Povinné testy po první migraci

- aktivní produkt je veřejně čitelný, neaktivní a archivovaný nejsou,
- aktivace selže bez tří překladů, obou cen, skladu, hlavní fotografie a tří ALT,
- dvě souběžné objednávky posledního kusu nevytvoří záporný sklad,
- opakovaný checkout s jedním idempotency key vrátí tutéž objednávku,
- opakovaná GoPay událost neodečte sklad ani neodešle e-mail dvakrát,
- Packeta zásilka vznikne pro objednávku nejvýše jednou,
- editor nemůže číst zákaznické údaje,
- Storage odmítne neadministrátorský zápis.

## Co baseline ještě neřeší provozně

- nasazení připraveného Cloudflare Cron Triggeru pro expiraci rezervací,
- e-mailový retry/outbox worker a webhook doručitelnosti,
- pravidelnou synchronizaci tracking stavů Packety,
- spuštění připravené šifrované GitHub zálohy a ověřenou obnovu; Free nemá PITR,
- produkční migrace existující databáze. Baseline je pouze pro prázdný development projekt.

Před produkcí vytvořit samostatný `amaree-production`, nepřenášet development klíče, ověřit obnovu zálohy a každou další změnu provádět novou verzovanou migrací.
