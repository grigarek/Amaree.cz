# AMARÉE e-shop

Vlastní e-shop značky AMARÉE postavený na Next.js App Routeru, TypeScriptu, Tailwind CSS a připraveném Supabase backendu. Aktuální větev je produkční příprava, nikoli produkční nasazení.

Přesný stav hotových, vypnutých a navazujících částí je v `docs/PROJECT_STATUS.md`.

## Technologie

- Next.js 16, React 19, TypeScript a Tailwind CSS,
- Supabase Auth, PostgreSQL, RLS a Storage,
- GoPay serverový sandbox adaptér,
- Packeta Widget v6 a REST/XML serverový adaptér,
- Ecomail Transactional API adaptér,
- OpenNext adaptér pro paralelní Cloudflare Workers staging,
- Vitest pro obchodní, bezpečnostní a integrační kontrakty.

## Lokální spuštění

```bash
npm install
cp .env.example .env.local
npm run dev
```

Český trh běží na `/cs` v CZK, slovenský na `/sk` v EUR a administrace na `/admin`. Přepínač CZ/SK s vlajkami je v horním banneru; při změně trhu se kvůli rozdílné měně a dopravě vyprázdní košík. Veřejné EN/DE přepínání je dočasně vypnuté, datový model však překlady CS/SK/EN/DE zachovává.

Lokální demo katalog se použije pouze při `APP_ENV=development`, když Supabase není nakonfigurovaný. Staging ani production demo produkty jako fallback nezobrazí.

## Povinné kontroly

```bash
npm run typecheck
npm run lint
npm run test
npm run products:validate
npm run build
```

Kontrola osiřelých Storage objektů je ve výchozím stavu pouze dry-run:

```bash
npm run storage:orphans
```

Mazání vyžaduje současně argument `--apply` a `CONFIRM_ORPHAN_DELETE=true`.

## Supabase

Konsolidovaný baseline `supabase/migrations/202607170001_development_baseline.sql` je určen pouze pro prázdný vývojový projekt. Na připojeném development Supabase je spuštěný společně s navazujícími migracemi produktového workflow, integrací, puncovních údajů, slevových kódů a slovenského trhu. Audit je v `docs/supabase/MIGRATION_AUDIT_2026-07-17.md`, bezpečný postup v `docs/supabase/MIGRATION_PLAN.md`.

Po spuštění baseline a vytvoření schváleného admin účtu umí `/admin`:

- plný CRUD produktů včetně CS/SK/EN/DE, CZK/EUR, skladu, SEO a lifecycle,
- fotografie v Supabase Storage včetně pořadí, hlavní fotografie a ALT,
- seznam/detail objednávek, interní poznámku, historii stavů, e-mailů a audit,
- stavové e-maily a samostatné Packeta akce.

Postup prvního produktu je v `docs/admin/FIRST_TEST_PRODUCT.md`.

## Checkout a sklad

Checkout podporuje pouze Česko a Slovensko. Serverové RPC vždy znovu načte aktivní produkty a ceny z databáze, vypočte dopravu/slevu/poplatek, vytvoří objednávku a rezervuje sklad pod idempotency key. Peníze jsou v databázi integer v nejmenších jednotkách měny.

- GoPay: rezervace 30 minut,
- bankovní převod: rezervace 3 dny,
- dobírka: sklad se při vytvoření objednávky potvrdí,
- opakovaný checkout/webhook nesmí vytvořit druhou objednávku ani odečet.

Cloudflare konfigurace obsahuje Cron Trigger pro expiraci rezervací po 15 minutách. Není aktivní, dokud není schválen a nasazen staging Worker.

## Integrace

### GoPay

Staging používá pouze sandbox. Integrace je vypnutá přes `GOPAY_CHECKOUT_ENABLED=false`, dokud neproběhne databázový a end-to-end test.

```text
https://test.amaree.cz/cs/objednavka/vysledek
https://test.amaree.cz/api/payments/gopay/notification
```

### Packeta

Widget key je veřejný identifikátor, API password je pouze serverové tajemství. Packeta nemá sandbox; staging musí používat majitelem potvrzené údaje a odděleného testovacího odesílatele. Serverové volání je vypnuté přes `PACKETA_API_ENABLED=false`.

Majitelem potvrzený Packeta widget/API klíč lze používat ve stagingu. Veřejný
widget klíč patří pouze do `NEXT_PUBLIC_PACKETA_WIDGET_API_KEY`; serverové API
heslo musí zůstat výhradně v ignorovaném `.env.local` nebo v serverových secrets hostingu.

### Ecomail

Transakční odesílání je vypnuté přes `ECOMAIL_SEND_ENABLED=false`. Před zapnutím je potřeba placený/testovací účet, ověřená odesílací doména a doručovací test. Marketingový newsletter je oddělený od provozních zpráv.

### OpenAI pomocník produktů

AI pomocník v `/admin` je volitelný a ve výchozím stavu vypnutý. Používá OpenAI Responses API pouze po ručním kliknutí administrátora, nejvýše pět fotografií zmenšených v prohlížeči a před vložením vždy zobrazí porovnání návrhů. Bez API klíče funguje e-shop i celá administrace normálně.

1. V [OpenAI API dashboardu](https://platform.openai.com/) vytvořte samostatný API projekt, nastavte rozpočtový limit a vytvořte serverový klíč.
2. Lokálně vložte klíč pouze do ignorovaného `.env.local` jako `OPENAI_API_KEY`. Nastavte `AI_PRODUCT_ASSISTANT_ENABLED=true`.
3. Na Cloudflare vložte klíč jako šifrovaný secret, nikdy jako `vars` ani `NEXT_PUBLIC_*`: `npx wrangler secret put OPENAI_API_KEY --env staging`.
4. Až poté změňte `AI_PRODUCT_ASSISTANT_ENABLED` pro požadované prostředí na `true` a znovu nasaďte Worker.

Výchozí model `gpt-5-mini` lze změnit přes `OPENAI_PRODUCT_ASSISTANT_MODEL`. Použití OpenAI API se účtuje samostatně podle spotřeby a není zahrnuto v předplatném ChatGPT Plus. Migrace `202607200002_product_ai_assistant.sql` musí být před zapnutím spuštěná, protože zajišťuje audit a limity 5 požadavků za 15 minut a 30 za 24 hodin na administrátora.

## Staging hosting

Cloudflare Workers přes OpenNext je připravený jako levná cílová varianta. Vercel konfigurace zůstává beze změny jako dosavadní fallback, dokud Cloudflare staging neprojde end-to-end kontrolou. Staging používá development Supabase a pouze testovací integrace, vrací `noindex, nofollow`, nemá sitemap URL a poskytuje `/api/health`.

- Cloudflare audit: `docs/deployment/CLOUDFLARE_COMPATIBILITY_AUDIT.md`,
- Workers staging: `docs/deployment/CLOUDFLARE_WORKERS.md`,
- Supabase Free provoz: `docs/operations/SUPABASE_FREE_OPERATIONS.md`,
- proměnné: `docs/deployment/VERCEL_PREVIEW_ENV.md`,
- Vercel + Active24 DNS: `docs/deployment/STAGING_VERCEL_ACTIVE24.md`.

Doména `amaree.cz`, production klíče, produkční databáze ani DNS se v této fázi nemění.

## Před produkcí

- schválit a otestovat baseline na prázdném development Supabase,
- vytvořit první skutečný produkt pouze přes `/admin`,
- ověřit souběžný sklad, platby, zásilky a e-maily end-to-end,
- zapnout zálohy a provést zkušební obnovu,
- dokončit retry worker, expiraci rezervací a tracking synchronizaci,
- právně zkontrolovat české texty a následně překlady,
- dokončit bezpečnostní, mobilní, přístupnostní a vizuální QA,
- produkční nasazení provést až po výslovném schválení majitele.
