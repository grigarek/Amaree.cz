# GoPay

Stav: serverová sandbox implementace připravená v kódu. Checkout je vypnutý a žádná platba se bez vývojového Supabase, sandbox údajů a explicitního přepínače nevytvoří.

## Tok platby

1. Server znovu načte produkty, ověří sklad a vypočítá cenu z důvěryhodného katalogu.
2. RPC `create_checkout_order` vytvoří objednávku ve stavu `awaiting_payment` a sklad rezervuje na 30 minut.
3. Server získá OAuth token s rozsahem `payment-create` a vytvoří GoPay platbu.
4. GoPay `id` se uloží jako `payment_provider_reference` a zákazník se přesměruje na vrácené `gw_url`.
5. Návratová stránka je `https://test.amaree.cz/cs/objednavka/vysledek`; notifikační URL je `https://test.amaree.cz/api/payments/gopay/notification` a přijímá pouze ID platby.
6. Server získá token `payment-all`, načte skutečný stav přímo z GoPay a mapuje jej na interní stav.
7. Kombinace provider reference a ověřeného stavu se ukládá idempotentně v Supabase transakci.
8. Sklad se odečte a potvrzovací e-mail se odešle pouze při prvním přechodu do `paid`.

Klient nikdy neposílá důvěryhodnou cenu. Částka pro GoPay vzniká ze serverového součtu objednávky.

## Stavy

| GoPay | Interní stav |
| --- | --- |
| `CREATED`, `PAYMENT_CREATED`, `PAYMENT_METHOD_CHOSEN`, `AUTHORIZED` | `pending` / objednávka `awaiting_payment` |
| `PAID` | `paid` |
| `TIMEOUTED` | `expired` / objednávka `cancelled` po uvolnění rezervace |
| `CANCELED` | `cancelled` |
| `REFUNDED`, `PARTIALLY_REFUNDED` | `refunded` |

## Proměnné prostředí

```text
GOPAY_ENVIRONMENT=sandbox
GOPAY_GO_ID=
GOPAY_CLIENT_ID=
GOPAY_CLIENT_SECRET=
GOPAY_CHECKOUT_ENABLED=false
NEXT_PUBLIC_GOPAY_ENABLED_METHODS=
```

Citlivé údaje jsou pouze serverové. Do logů se nesmí zapisovat Client Secret, OAuth token, úplná data zákazníka ani platební údaje.

Seznam zákaznicky komunikovaných metod (karta, Apple Pay, Google Pay, online bankovní převod) se načte z `NEXT_PUBLIC_GOPAY_ENABLED_METHODS` až podle skutečné aktivace účtu. Klasický převod na účet MEDIANUM s.r.o. je samostatná platební metoda a není součástí tohoto seznamu.

## Přechod do produkce

1. Schválit a spustit baseline na prázdném development Supabase a provést databázové integrační testy.
2. Projít sandbox scénáře `PAID`, `CANCELED` a `TIMEOUTED`.
3. Nechat GoPay zkontrolovat integraci a získat produkční údaje.
4. Nastavit HTTPS návratovou a notifikační URL v GoPay účtu.
5. Změnit `GOPAY_ENVIRONMENT=production` až v produkčním secrets manageru.
6. Zapnout `GOPAY_CHECKOUT_ENABLED=true` až po finálním end-to-end testu.
7. Ověřit, že sandbox údaje nejsou dostupné zákazníkům a produkční údaje nejsou v repozitáři.

## Údaje potřebné od GoPay

- GoID e-shopu / obchodního místa,
- sandbox Client ID,
- sandbox Client Secret,
- potvrzené povolené platební metody a měna CZK,
- obchodní evidenční číslo nebo identifikace žádosti pro komunikaci s integracemi,
- nastavení a schválení návratové URL,
- nastavení a schválení HTTP notifikační URL,
- požadovaný režim redirect vs. inline; projekt nyní počítá s bezpečnějším redirect tokem,
- nastavení životnosti plateb,
- logo pro platební bránu,
- po dokončení kontroly produkční GoID, Client ID a Client Secret,
- kontaktní e-mail pro technické a provozní notifikace.

## Oficiální dokumentace

- https://help.gopay.com/en/knowledge-base/integration-of-payment-gateway/integration-of-payment-gateway-1/how-do-i-integrate-the-payment-gateway
- https://help.gopay.com/en/knowledge-base/integration-of-payment-gateway/integration-of-payment-gateway-1/state-of-payment
- https://help.gopay.com/en/knowledge-base/integration-of-payment-gateway/integration-of-payment-gateway-1/testing-payments-in-the-sandbox
- https://doc.gopay.com/
