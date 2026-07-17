# AMARÉE deployment checklist

## Development Supabase

- [ ] baseline byl schválen a spuštěn jen na prázdném development projektu,
- [ ] veřejná registrace Auth je vypnutá a první admin je v `admin_users`,
- [ ] anon/editor/admin RLS scénáře jsou ověřené,
- [ ] souběžná rezervace posledního kusu nevytvoří záporný sklad,
- [ ] Storage upload, pořadí, ALT, archivace a orphan dry-run jsou ověřené,
- [ ] záloha a obnova do odděleného projektu byly vyzkoušené.

## Staging

- [ ] `npm run typecheck`, `lint`, `test`, `products:validate` a `build` procházejí,
- [ ] `npm run cf:build` a Wrangler `--dry-run --env staging` procházejí pod Free limitem,
- [ ] Cloudflare staging používá jen development Supabase a testovací integrace,
- [ ] workers.dev `/api/health` vrací `environment: staging`,
- [ ] robots, HTML metadata a `X-Robots-Tag` mají noindex/nofollow,
- [ ] staging sitemap je prázdná,
- [ ] GoPay return a notification URL odpovídají dokumentaci,
- [ ] Packeta používá majitelem potvrzené údaje a odděleného testovacího odesílatele,
- [ ] Ecomail používá ověřenou testovací odesílací doménu.

## End-to-end

- [ ] první skutečný produkt vznikl přes `/admin`, ne úpravou zdrojového kódu,
- [ ] neaktivní produkt není veřejný, aktivní produkt má CS/EN/DE, CZK/EUR a fotografie,
- [ ] opakovaný checkout vrátí tutéž objednávku,
- [ ] opakovaný GoPay webhook neodečte sklad ani neposílá e-mail dvakrát,
- [ ] dobírka a bankovní převod mají správný skladový a stavový tok,
- [ ] Packeta zásilka vznikne jen jednou a štítek/tracking fungují,
- [ ] potvrzovací, stavový, trackingový a reklamační e-mail dorazí,
- [ ] audit obsahuje administrátora, starý/nový stav a čas.

## Před production

- [ ] právní texty a okamžik uzavření smlouvy schválil právník/majitel,
- [ ] ceny, sklad, doprava CZ/SK, fotografie, ALT a SEO schválil majitel,
- [ ] automatická expirace rezervací, retry e-mailů a tracking synchronizace jsou zapojené,
- [ ] MFA, monitoring, cookie consent, analytika a incidentní postup jsou hotové,
- [ ] produkční Supabase, GoPay, Packeta a Ecomail klíče jsou oddělené od stagingu,
- [ ] GitHub záloha proběhla a byla obnovena do odděleného testovacího projektu,
- [ ] před případným přesunem DNS byly opsány a ověřeny Active24 MX, SPF, DKIM a DMARC,
- [ ] `amaree.cz` se připojí až po výslovném schválení.
