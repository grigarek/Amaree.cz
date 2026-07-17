# Stav projektu AMARÉE

Aktuální větev obsahuje produkční přípravu, ale nebyla nasazena a konsolidovaná migrace nebyla spuštěna. Bez připojeného vývojového Supabase proto nelze administraci ani checkout považovat za provozně aktivní.

Cloudflare Workers varianta přes OpenNext byla lokálně sestavena a prošla Wrangler dry-run s gzip balíčkem 1 877,59 KiB. Nebyla nahrána na Cloudflare, nepřipojila DNS a Vercel konfigurace zůstala zachovaná. Detaily jsou v `docs/deployment/CLOUDFLARE_COMPATIBILITY_AUDIT.md`.

## Funkční bez externích účtů

- český veřejný web, katalogové rozhraní, detail produktu, košík, checkout formulář a responzivní rozvržení,
- serverová a klientská validace checkoutu pro Česko a Slovensko,
- lokální demo katalog pouze při `APP_ENV=development` bez Supabase,
- staging noindex/nofollow, prázdná staging sitemap a konfigurační health endpoint,
- automatické testy katalogu, checkoutu, skladu, produktových dat, obrázků, GoPay mapování, Packety, e-mailů a oprávnění.

## Připraveno v kódu, čeká na vývojový Supabase

- Supabase Auth bez veřejné registrace, explicitní `admin_users`, role `admin` a `editor`, odhlášení a audit loginů,
- databázový katalog a plný produktový CRUD v `/admin`, lokalizace CS/EN/DE, ceny CZK/EUR, sklad, aktivace, deaktivace, duplikace a archivace,
- Supabase Storage upload, náhledy, pořadí, hlavní fotografie, ALT CS/EN/DE, archivace, mazání a dry-run kontrola osiřelých souborů,
- transakční vytvoření objednávky z databázových cen, rezervace skladu, idempotency key a historie platby/stavu,
- seznam a detail objednávek, interní poznámka, stavové změny, e-mailový náhled/opakování, Packeta akce a audit,
- RLS: veřejnost čte jen aktivní katalog; editor spravuje katalog; objednávky a integrace spravuje pouze admin.

Konsolidovaný baseline `supabase/migrations/202607170001_development_baseline.sql` je určen výhradně pro prázdný vývojový projekt. Byl staticky auditován, ale nebyl proveden proti PostgreSQL/Supabase; první testovací spuštění vyžaduje souhlas majitele.

## Připravené, ale bezpečně vypnuté integrace

- **GoPay:** serverový sandbox adaptér, přesné staging callback URL, ověření stavu server-to-server a databázová idempotence. Čeká na sandbox údaje a end-to-end test; `GOPAY_CHECKOUT_ENABLED=false`.
- **Packeta:** widget/validace, serverové REST/XML vytvoření zásilky, štítek pro PUDO i home delivery, tracking a ochrana proti dvojímu vytvoření. Majitelem potvrzený původní widget/API klíč lze použít; ostré serverové volání čeká na bezpečné uložení API hesla, nastavení odesílatele a ověření služeb; `PACKETA_API_ENABLED=false`.
- **Ecomail:** transakční API, textové/HTML šablony, dedupe a databázová historie. Čeká na testovací účet, ověřenou odesílací doménu a doručovací test; `ECOMAIL_SEND_ENABLED=false`.

Packeta klíče se nesmí zapisovat do repozitáře. Veřejný widget klíč je oddělený
od serverového API hesla; heslo patří pouze do serverových secrets.

## Stále demonstrační nebo nehotové

- Luna, Sera a Aura v lokálním fallbacku jsou pouze vizuální demo data,
- slevy a odběratelé mají zatím pouze informační administrační obrazovky, ne plný CRUD,
- expirace rezervací má připravený Cloudflare Cron, ale bez staging deploymentu neběží; synchronizace trackingu a retry e-mailové fronty stále potřebují samostatnou úlohu,
- varianty mají databázový model, ale současný produktový formulář spravuje základní produkt bez variant,
- reklamace mají databázový model a e-mailové šablony, ale nemají dokončené administrační CRUD,
- právní texty čekají na právní kontrolu; EN/DE jsou dočasně vypnuté ve veřejné navigaci,
- šifrovaná Free záloha a kontrola limitů jsou připravené jako GitHub workflow, ale nebyly spuštěné ani zkušebně obnovené; MFA, monitoring, analytika a cookie consent nejsou ověřené.

## Před produkcí musí schválit majitel

- skutečné produkty, ceny, sklad, fotografie, ALT/SEO a okamžik aktivace,
- ceny a služby dopravy pro Česko a Slovensko,
- platební metody, e-mailové šablony a právní obsah,
- testovací scénáře GoPay, Packeta a Ecomail,
- zálohování a zkušební obnovu databáze,
- finální desktopové a mobilní QA.
