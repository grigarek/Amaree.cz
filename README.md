# AMARÉE e-shop

Produkčně připravený základ vlastního e-shopu pro českou značku šperků **A M A R É E**, postavený na Next.js App Routeru, TypeScriptu, Tailwind CSS a připravený pro Supabase, Stripe a Resend.

## Analýza referenčního webu

Referenční Webnode web `https://amaree-cz-05c3ad.webnode.cz/` potvrzuje:

- wordmark `A M A R É E` a claim `EST. 2025`,
- českou navigaci: Úvod, Kolekce, O nás, Inspirace, Kontakt,
- hlavní text: „Minimalistická elegance, která podtrhne váš styl. Kvalitní materiály. Nadčasový design.“,
- elegantní bílý layout s tmavě rubínovým akcentem,
- e-shopovou strukturu s košíkem a měnou CZK,
- Webnode footer a branding, který se v nové aplikaci nepoužívá,
- dostupné vlastní vizuály přes CDN, použité dočasně jako migrované referenční obrázky.

Obsah ze zadání má přednost tam, kde se liší od referenčního webu. Produktová data v repozitáři jsou označená jako demonstrační a musí se před ostrým spuštěním ověřit.

## Technologie

- Next.js 15, App Router, React 19
- TypeScript
- Tailwind CSS
- next-intl se soubory `messages/cs.json`, `messages/en.json`, `messages/de.json`
- Supabase PostgreSQL, Storage a Authentication
- Modulární platební vrstva se Stripe adaptérem
- Modulární e-mailová vrstva s Resend adaptérem
- Vitest testy pro ceny, košík, checkout, i18n, admin přístup a webhook idempotenci

## Lokální spuštění

```bash
npm install
cp .env.example .env.local
npm run dev
```

Výchozí stránka přesměruje na `/cs`. Jazykové verze jsou `/cs`, `/en`, `/de`. Administrace je na `/admin`.

## Proměnné prostředí

Nikdy necommitujte skutečné tajné klíče. Použijte `.env.local` podle `.env.example`.

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ADMIN_EMAILS`
- `FREE_SHIPPING_THRESHOLD_CZK`

## Supabase

1. Vytvořte projekt v Supabase.
2. Spusťte migraci `supabase/migrations/202607140001_initial_schema.sql`.
3. Vytvořte Storage bucket pro produktové fotografie, například `product-images`.
4. Nastavte RLS policies podle produkčních admin e-mailů. Migrace obsahuje základní veřejné čtení aktivních produktů.
5. Spusťte seed:

```bash
npm run seed
```

Poznámka: obrázky jsou zatím linkované z původního CDN. Pro ostrý provoz je nahrajte do Supabase Storage a aktualizujte URL v administraci nebo seed datech.

## Platby

Checkout endpoint je připravený na `/api/checkout`. Před vytvořením objednávky znovu počítá ceny ze serverového katalogu a validuje sklad.

Stripe webhook je na:

```text
/api/webhooks/stripe
```

Produkční dokončení:

- vytvořit pending objednávku v Supabase transakčně,
- zavolat `getPaymentProvider("stripe").createCheckoutSession()`,
- ukládat `payment_provider_reference`,
- ukládat webhook event ID do `payment_webhook_events`,
- po potvrzení platby odečíst sklad a odeslat e-mail.

GoPay nebo Comgate lze doplnit implementací rozhraní `PaymentProvider`.

## E-maily

E-mailová abstrakce je v `src/lib/email`. Resend adaptér připravuje potvrzení objednávky. Před ostrým provozem ověřte odesílací doménu a SPF/DKIM/DMARC.

## Právní obsah

Právní stránky obsahují jasné `TODO`. Záměrně nejsou doplněné IČO, DIČ, provozující společnost, bankovní spojení ani kontaktní osoby, protože finální údaje nebyly v zadání dodané.

## Testy a kontroly

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

V tomto prostředí nebyl dostupný `npm`, proto kontroly spusťte po instalaci závislostí v běžném Node.js prostředí.

## Nasazení na Vercel

1. Připojte GitHub repozitář do Vercelu.
2. Nastavte env proměnné pro production i preview.
3. Nastavte `NEXT_PUBLIC_SITE_URL` na produkční doménu.
4. Ověřte Supabase URL, anon key a service role key.
5. Nastavte Stripe webhook endpoint.
6. Nastavte Resend doménu.
7. Připojte doménu `amaree.cz` nebo cílovou doménu.
8. Spusťte production build.

## Checklist před ostrým spuštěním

- Nahradit všechna demonstrační produktová data skutečnými názvy, cenami, popisy a skladovostí.
- Přenést fotografie z referenčního webu do Supabase Storage.
- Zkontrolovat EN a DE pracovní překlady rodilým mluvčím.
- Doplnit právní dokumenty a firemní údaje.
- Ověřit Stripe webhook v testovacím režimu.
- Ověřit odečítání skladu až po potvrzení platby.
- Ověřit transakční e-maily.
- Otestovat checkout na mobilu.
- Ověřit sitemap, robots, canonical a hreflang.
- Přidat analytiku až po souhlasu s cookies.
