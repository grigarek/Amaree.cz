# Audit migrací AMARÉE – 17. 7. 2026

## Výsledek

Původní migrace nebylo bezpečné aplikovat za sebou. Obě byly přesunuty do `docs/supabase/archive/` a aktivní adresář `supabase/migrations/` nyní obsahuje jediný konsolidovaný baseline pro prázdný vývojový projekt.

Migrace nebyla spuštěna v žádném Supabase projektu.

## Původní migrace

### `202607140001_initial_schema.sql`

- Kombinovala překlady v JSONB a jediný veřejný slug s budoucím požadavkem na samostatné CS/EN/DE slugy.
- Podporovala pouze CZK a jeden cenový sloupec.
- Neobsahovala varianty, barvu, hmotnost, SEO, příznak novinky ani archivaci.
- RLS určovala administrátory přes databázové nastavení `app.admin_emails`; to není vhodný hostovaný model rolí.
- Objednávky neměly stavovou, platební, e-mailovou ani administrátorskou auditní historii.

### `202607150001_packeta_gopay_draft.sql`

- Byla správně označena `DRAFT ONLY` a překrývala objednávkové a platební sloupce prvního schématu.
- Přidávala rezervace a reklamace bez úplných RLS politik.
- Neobsahovala transakční vytvoření objednávky ani bezpečný životní cyklus rezervace.
- Neřešila varianty, zásilky, štítky, e-mailovou idempotenci a audit změn.

## Konsolidovaný baseline

`202607170001_development_baseline.sql` vytváří:

- administrátory s rolemi `admin` a `editor`, login události a audit změn,
- normalizované kategorie, produkty, překlady, varianty, ceny CZK/EUR a sklad,
- produktové fotografie a lokalizované ALT texty,
- objednávky, položky, rezervace, pohyby skladu a stavovou historii,
- platby, historii plateb a idempotentní evidenci webhooků,
- Packeta pobočky, zásilky, tracking a jedinečný požadavek na vytvoření zásilky,
- e-mailové zprávy s unikátním deduplikačním klíčem,
- slevové kódy, reklamace a jejich historii,
- RLS pro veřejný aktivní katalog a chráněnou administraci,
- Storage bucket s omezením typu a velikosti souborů,
- transakční funkce pro rezervaci, potvrzení a uvolnění skladu.

## Bezpečnostní podmínky prvního spuštění

Baseline lze spustit pouze na prázdném vývojovém projektu po ručním SQL review. Před spuštěním je nutné:

1. potvrdit ceny dopravy a dobírky pro Česko a Slovensko,
2. ověřit, že Supabase projekt neobsahuje žádné uživatelské tabulky,
3. po migraci vytvořit prvního uživatele přes pozvánku v Supabase Auth,
4. vložit jeho UUID a e-mail do `admin_users` jako roli `admin`,
5. otestovat anon, authenticated, editor a admin RLS scénáře,
6. otestovat souběžnou rezervaci posledního kusu,
7. nepropagovat baseline do produkce bez zálohy a ověřené obnovy.

## Známé navazující kroky

- Checkout aplikace musí volat serverové RPC nad tímto schématem; nikdy nesmí skládat objednávku přímými klientskými inserty.
- Expirace rezervací potřebuje plánovanou serverovou úlohu.
- GoPay a Packeta kontrakty je nutné ověřit proti jejich sandbox API.
- Odstranění osiřelých Storage objektů bude řešit plánovaná úloha až po databázové archivaci.
