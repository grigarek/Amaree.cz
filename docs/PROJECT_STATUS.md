# Stav projektu AMARÉE

Aktuální větev obsahuje produkční přípravu nasazenou na neveřejném Cloudflare stagingu. Vývojový Supabase je připojený, konsolidovaný baseline, produktový workflow, AI pomocník, provozní nastavení i puncovní migrace byly spuštěné. Staging stále není produkce: nemá ostré platby ani povolenou serverovou tvorbu zásilek.

Cloudflare Workers varianta přes OpenNext běží na `https://amaree-staging.amaree-cz.workers.dev`. Cloudflare DNS zóna je připravená jako neaktivní kopie záznamů Active24, ale nameservery nebyly přepnuté a hlavní doména stále nebyla připojena k Workeru. Vercel konfigurace zůstala zachovaná. Detaily jsou v `docs/deployment/CLOUDFLARE_COMPATIBILITY_AUDIT.md`.

## Funkční bez externích účtů

- český `/cs` a slovenský `/sk` veřejný web, katalog, detail produktu, košík, checkout a responzivní rozvržení; CZ/SK přepínač s vlajkami je v horním banneru,
- serverová a klientská validace checkoutu pro Česko a Slovensko,
- lokální demo katalog pouze při `APP_ENV=development` bez Supabase,
- staging noindex/nofollow, prázdná staging sitemap a konfigurační health endpoint,
- automatické testy katalogu, checkoutu, skladu, produktových dat, obrázků, GoPay mapování, Packety, e-mailů a oprávnění.

## Aktivní ve vývojovém Supabase

- Supabase Auth bez veřejné registrace, explicitní `admin_users`, role `admin` a `editor`, odhlášení a audit loginů,
- databázový katalog a záložkový produktový editor v `/admin`, automatické SKU/slug/SEO, fotografie v jednom pracovním postupu, lokalizace CS/SK/EN/DE, ceny CZK/EUR, sklad, koncept/aktivní/skrytý/archivovaný stav, duplikace a kontrola před publikací,
- Supabase Storage upload, náhledy, pořadí, hlavní fotografie, ALT CS/SK/EN/DE, archivace, mazání a dry-run kontrola osiřelých souborů,
- transakční vytvoření objednávky z databázových cen, rezervace skladu, idempotency key a historie platby/stavu,
- povinný serverově ověřený souhlas s obchodními podmínkami, uložený čas, verze a snapshot českých nebo slovenských podmínek objednávky,
- seznam a detail objednávek, interní poznámka, stavové změny, e-mailový náhled/opakování, Packeta akce a audit,
- RLS: veřejnost čte jen aktivní katalog; editor spravuje katalog; objednávky a integrace spravuje pouze admin.

Konsolidovaný baseline `supabase/migrations/202607170001_development_baseline.sql` je určen výhradně pro prázdný vývojový projekt a byl na development Supabase spuštěn. Následné migrace včetně slovenského katalogu, EUR cen, CS/SK e-mailů, slev a puncovní evidence jsou rovněž aktivní. Produkční databáze zatím neexistuje.

## Připravené, ale bezpečně vypnuté integrace

- **Puncovní informace:** administrační evidence, soukromé produktové doklady a podmíněná veřejná stránka jsou připravené v kódu i development databázi. Vyžadují doplnění skutečně ověřených údajů; výchozí stav je skrytý.

- **GoPay:** serverový sandbox adaptér, oficiální platební značky, přesné staging callback URL, ověření stavu server-to-server a databázová idempotence. Poptávka obchodníka byla odeslána a e-mail ověřen 20. 7. 2026. Čeká se na sandbox GoID, Client ID a Client Secret; `GOPAY_CHECKOUT_ENABLED=false`.
- **Packeta:** widget/validace, serverové REST/XML vytvoření zásilky, štítek pro PUDO i home delivery, tracking a ochrana proti dvojímu vytvoření. API heslo je uložené pouze jako Cloudflare secret, odesílatel `AMARÉE.CZ` a home carrier ID `106`/`131` jsou nastavené. Protože Packeta nemá sandbox, první skutečné serverové volání čeká na řízený test; `PACKETA_API_ENABLED=false`.
- **Transakční e-maily:** poskytovatelsky nezávislá vrstva, aktivní adaptér Resend, CS/SK HTML šablony s obrázky produktů, příloha obchodních podmínek, dedupe, limity, fronta a databázová historie. `notify.amaree.cz` je v Resendu ověřená a API klíč je uložený jako Cloudflare secret. Staging doručuje pouze na interní testovací adresu; produkční odesílání zůstává vypnuté.
- **Ecomail:** ponechán pouze jako budoucí volitelná newsletterová integrace; není součástí objednávkových e-mailů.

Packeta klíče se nesmí zapisovat do repozitáře. Veřejný widget klíč je oddělený
od serverového API hesla; heslo patří pouze do serverových secrets.

## Stále demonstrační nebo nehotové

- produkty řad Rosée, Minuit a Lueur tvoří aktuální katalog v Supabase; Luna, Sera a Aura v lokálním fallbacku jsou pouze vizuální demo data,
- slevové kódy mají administrační CRUD; samostatná agenda odběratelů zatím zůstává pouze informační,
- expirace rezervací má na staging Workeru Cloudflare Cron každých 15 minut; synchronizace trackingu a retry e-mailové fronty stále potřebují samostatnou úlohu,
- varianty mají databázový model, ale současný produktový formulář spravuje základní produkt bez variant,
- reklamace mají databázový model a e-mailové šablony, ale nemají dokončené administrační CRUD,
- české i slovenské právní texty čekají na finální právní kontrolu pro přeshraniční prodej; EN/DE jsou dočasně vypnuté ve veřejné navigaci,
- šifrovaná Free záloha a kontrola limitů jsou připravené jako GitHub workflow, ale nebyly spuštěné ani zkušebně obnovené; MFA, monitoring, analytika a cookie consent nejsou ověřené.

## Před produkcí musí schválit majitel

- skutečné produkty, ceny, sklad, fotografie, ALT/SEO a okamžik aktivace,
- ceny a služby dopravy pro Česko a Slovensko,
- platební metody, e-mailové šablony a právní obsah,
- testovací scénáře GoPay, Packeta a Resend,
- zálohování a zkušební obnovu databáze,
- finální desktopové a mobilní QA.
