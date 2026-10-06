# Supabase Free: záloha, limity a obnova

Free projekt nemá garantovanou denní platformní zálohu. Připravený workflow `.github/workflows/supabase-free-backup.yml` proto jednou denně vytvoří logický dump rolí, schématu a dat, export klíčových tabulek a kopii skutečných souborů z `product-images`. Výsledek je před uploadem zašifrovaný AES-256 a GitHub artifact se drží 30 dní. Zálohy se necommitují do repozitáře.

## GitHub secrets

- `SUPABASE_DB_URL`: session pooler nebo přímé PostgreSQL spojení,
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL,
- `SUPABASE_SERVICE_ROLE_KEY`: serverový service role key,
- `BACKUP_ENCRYPTION_PASSWORD`: unikátní dlouhé heslo uložené také mimo GitHub.

Po první migraci spusťte workflow ručně a ověřte stažení, checksum, dešifrování a obsah. Selhání kontroly limitů workflow označí červeně až po bezpečném uložení zálohy.

## Limity a upozornění

`npm run supabase:limits` používá service-role-only RPC a varuje při 400 MB databáze nebo 800 MB Storage, tedy zhruba na 80 % Free kvót 500 MB a 1 GB. Workflow failure slouží jako upozornění e-mailem z GitHub Actions. V Supabase dashboardu se navíc každý týden kontroluje egress a aktivita projektu.

Praktický přechod na placený tarif je nutný před překročením limitu, při potřebě garantovaných denních záloh/PITR, pokud Free projekt nesmí být pozastaven pro neaktivitu, nebo když provoz potřebuje samostatný stabilní produkční a staging projekt nad Free kvótu.

## Zkušební obnova

Obnovu nikdy netestujte přes aktivní databázi:

1. vytvořte nový dočasný Supabase projekt,
2. stáhněte artifact a ověřte `.sha256`,
3. dešifrujte `openssl enc -d -aes-256-cbc -pbkdf2 -in BACKUP.enc -out backup.tar.gz`,
4. rozbalte archiv a obnovte `roles.sql`, `schema.sql`, `data.sql` do nové DB podle aktuálního Supabase restore návodu,
5. znovu vytvořte Auth nastavení, redirect URL a secrets; ty v dumpu nejsou konfiguračním zálohováním,
6. obnovte skutečné soubory z `critical/storage/product-images` do stejného bucketu a cest,
7. ověřte počty z `manifest.json`, RLS, admin login, jednu fotografii a testovací objednávku,
8. výsledek a dobu obnovy zapište do provozního protokolu a dočasný projekt až po schválení odstraňte.

Databázový dump sám neobsahuje obsah Storage objektů: https://supabase.com/docs/guides/platform/backups. GitHub workflow vychází z oficiálního postupu: https://supabase.com/docs/guides/deployment/ci/backups.
