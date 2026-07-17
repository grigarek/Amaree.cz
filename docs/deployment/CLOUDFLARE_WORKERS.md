# Testovací nasazení přes Cloudflare Workers

Konfigurace je paralelní k Vercelu. `vercel.json` ani Vercel dokumentace se nemažou, dokud není Cloudflare staging funkčně a vizuálně ověřený.

## Prostředí

- development: lokální Next.js a development Supabase,
- staging: `amaree-staging.<account-subdomain>.workers.dev`, development Supabase a pouze testovací/vypnuté integrace,
- production: rezervované nastavení pro `amaree.cz`; bez výslovného schválení se nenasazuje.

Před prvním uploadem nahraďte ve `wrangler.jsonc` staging `NEXT_PUBLIC_SITE_URL` skutečnou `workers.dev` adresou přidělenou Cloudflare. Tajné hodnoty se nevkládají do souboru ani do GitHubu jako text.

## Povinné staging secrets

```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL --env staging
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --env staging
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
```

GoPay, serverová Packeta a Ecomail zůstávají vypnuté. Jejich testovací secrets se přidají až při samostatném schváleném end-to-end testu. Production secrets se nikdy nekopírují do stagingu.

## Ověřený postup bez nasazení

```bash
npm install
npm run cf:build
npx wrangler deploy --dry-run --env staging
```

## První testovací upload

Tyto příkazy zatím nebyly spuštěny:

```bash
npx wrangler login
npm run cf:upload:staging
```

`upload` vytvoří nedominantní verzi/preview URL; teprve po kontrole lze verzi nasadit přes Cloudflare dashboard nebo `npm run cf:deploy:staging`. Před jakýmkoli nasazením zkontrolovat `/api/health`, `/cs`, `/admin`, checkout, noindex hlavičku a logy Workeru.

## `test.amaree.cz` a Active24

Cloudflare Workers Custom Domain vyžaduje aktivní DNS zónu u Cloudflare. Při autoritativních nameserverech u Active24 proto nelze `test.amaree.cz` přímo připojit jako Worker Custom Domain na Free tarifu. Bez změny DNS používejte `workers.dev`.

Pokud bude později schválen vlastní subdoménový staging, bezpečný postup je:

1. ponechat registraci domény a e-mailové schránky u Active24,
2. opsat všechny DNS záznamy včetně MX, SPF, DKIM a DMARC,
3. přenést pouze autoritativní DNS zónu na Cloudflare,
4. před změnou nameserverů porovnat záznam po záznamu,
5. přidat `test.amaree.cz` jako Worker Custom Domain,
6. hlavní `amaree.cz` zatím nesměrovat na Worker.

Podklady: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/ a https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/

## Ochrana nákladů

- Free Worker má hard limit 100 000 požadavků denně, 10 ms CPU/request, 128 MB RAM, 50 subrequests a 3MiB gzip Workeru.
- Wrangler má nastavený CPU a subrequest limit; integrace jsou ve stagingu vypnuté.
- Statická aktiva se obslouží před Workerem a `_next/static` má dlouhou immutable cache.
- Cloudflare Images, R2, Queues ani placené observability nejsou zapnuté.
- Cron má jediný trigger po 15 minutách; Free účet dovoluje nejvýše pět.
- Zapnout Cloudflare upozornění na použití a týdenně kontrolovat Workers Analytics. Free limit nepřekračovat přidáním placené metody bez souhlasu majitele.
