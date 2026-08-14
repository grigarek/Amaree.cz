# Staging AMARÉE na Vercelu a DNS u Active24

## Cíl

Stabilní staging poběží na `https://test.amaree.cz`. Doména `amaree.cz` ani produkční integrace se v této fázi nepřipojují.

## Vercel projekt

1. Importovat GitHub repozitář do samostatného Vercel projektu `amaree-staging` nebo použít stabilní branch domain v jednom projektu.
2. Jako Production Branch tohoto staging projektu nastavit aktuální schválenou `codex/...` větev, nikoli `main`.
3. Nastavit proměnné pouze pro Vercel Preview a staging Production scope podle `docs/deployment/VERCEL_PREVIEW_ENV.md`.
4. Přidat doménu `test.amaree.cz` do staging projektu.
5. Z Vercel Domain Inspector opsat přesnou cílovou hodnotu CNAME. Nepoužívat hodnotu z návodu naslepo.

## Active24 DNS

V DNS zóně `amaree.cz` přidat pouze záznam, který ukáže Vercel:

| Název | Typ | Hodnota |
| --- | --- | --- |
| `test` | `CNAME` | přesná hodnota z Vercel Domain Inspector |

Neměnit nameservery, apex záznamy `amaree.cz`, `www`, MX, SPF, DKIM ani DMARC. Tím zůstane současná doména a e-mail nedotčený.

## Ověření

1. Vercel Domain Inspector musí ukázat `Valid Configuration`.
2. `https://test.amaree.cz/api/health` musí vrátit HTTP 200 a `environment: staging`.
3. `https://test.amaree.cz/robots.txt` musí zakazovat celý web.
4. `https://test.amaree.cz/sitemap.xml` musí být prázdná.
5. HTML odpověď musí obsahovat `noindex, nofollow`.
6. GoPay Return URL: `https://test.amaree.cz/cs/objednavka/vysledek`.
7. GoPay Notification URL: `https://test.amaree.cz/api/payments/gopay/notification`.

DNS záznam se přidá až po potvrzení uživatelem. Tento dokument žádné nasazení ani změnu DNS neprovádí.
