# Audit kompatibility Cloudflare Workers

Datum auditu: 17. 7. 2026. Audit vychází z Next.js 16.2.10, `@opennextjs/cloudflare` 1.20.1 a Wrangleru 4.111.0. Nic nebylo nasazeno, DNS ani Vercel konfigurace se nezměnily.

## Výsledek

Projekt lze zachovat jako Next.js aplikaci a provozovat přes OpenNext na Cloudflare Workers. `npm run cf:build` i Wrangler staging dry-run prošly. Výsledný Worker má 1 877,59 KiB gzip, pod 3MiB limitem Free tarifu. Všechny App Router stránky, serverové komponenty, `/admin`, route handlers a middleware byly součástí ověřeného balíčku.

Původní `proxy.ts` byl jediná přímá blokace: Next.js 16 jej vždy spouští v Node runtime a OpenNext Node Middleware zatím nepodporuje. Stejná logika je proto dočasně v `src/middleware.ts` jako podporovaný Edge Middleware. Next.js vypisuje deprecation warning; až OpenNext přidá Node Middleware, lze se vrátit k názvu `proxy.ts`.

## Audit částí aplikace

| Část | Stav | Poznámka |
| --- | --- | --- |
| Server Components a dynamické stránky | kompatibilní | Používají Next.js Node runtime, který OpenNext převádí na Worker. |
| Route handlers, API a webhooky | kompatibilní | Používají `fetch`, Web API a JSON; žádný dlouho běžící proces. |
| Middleware | kompatibilní po úpravě | Edge `middleware.ts`; Node `proxy.ts` není v OpenNext 1.20.1 podporovaný. |
| Supabase klienti, cookies a Auth | kompatibilní | `@supabase/ssr` používá HTTP/cookies; autorizaci stále vynucuje server a RLS. |
| Fotografie | kompatibilní s limitem dávky | 12 MB na soubor, 48 MB na požadavek; originál se nekomprimuje. Později lze přejít na signed direct upload. |
| `next/image` | kompatibilní bez placených Images | Cloudflare build nastaví `unoptimized`; originály obslouží Supabase Storage. |
| GoPay, Packeta, Resend a budoucí Ecomail newsletter | kompatibilní | Integrace jsou založené na odchozím HTTPS `fetch`; pro staging zůstávají vypnuté/testovací. |
| Packeta PDF štítky | kompatibilní | `Buffer`/base64 fungují přes `nodejs_compat`; štítky se negenerují na lokálním disku. |
| Expirace rezervací | připravená | Cron Trigger po 15 minutách volá service-role RPC s limitem 100 objednávek. |
| ISR a revalidace | bez externí cache | Katalog je dynamický ze Supabase. Pokud se později zapne ISR, bude potřeba R2/D1 cache. |

## Node.js API a moduly

Runtime kód používá `node:crypto` (`randomUUID`, `createHash`) a globální `Buffer` pro GoPay Basic Auth, kontrolu obrázků a Packeta PDF. Cloudflare je poskytuje s `nodejs_compat` a nastaveným compatibility date. Nepoužívá `fs`, `path`, sockety, child procesy ani zápis na lokální disk.

`node:fs/promises`, `node:path`, `process.argv` a `process.exit` se používají pouze v CLI skriptech pro import, validaci a zálohy. Ty běží v Node.js lokálně nebo v GitHub Actions, nikoli uvnitř Workeru.

## Známé limity a navazující práce

- Middleware používá dočasně deprecated Edge konvenci.
- Free Worker má 10 ms CPU na požadavek. Síťové čekání do Supabase se nepočítá jako CPU, ale velké PDF či obrazové transformace se ve Workeru nesmí zavádět.
- Worker drží maximálně 128 MB paměti; proto je upload omezen na 48 MB na dávku.
- OpenNext build nyní stahuje Google fonty. CI musí mít síťový přístup; pro maximální odolnost lze fonty později hostovat lokálně.
- `next` má v aktuálním npm auditu dvě moderate položky v transitive PostCSS. Automatický `npm audit fix --force` nabízí chybný breaking downgrade; čeká se na bezpečnou aktualizaci Next.js.

## Oficiální podklady

- OpenNext kompatibilita: https://opennext.js.org/cloudflare
- Cloudflare Next.js návod: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Node.js kompatibilita: https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- Limity Workers: https://developers.cloudflare.com/workers/platform/limits/
- OpenNext obrázky a cache: https://opennext.js.org/cloudflare/howtos/image a https://opennext.js.org/cloudflare/caching
