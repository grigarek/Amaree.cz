# Vercel Preview / staging proměnné

Všechny tajné hodnoty se zadávají přímo do Vercelu. Nikdy se neukládají do Git repozitáře.

## Aplikace

```text
APP_ENV=staging
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_SITE_URL=https://test.amaree.cz
SUPABASE_ENVIRONMENT=development
ALLOW_LOCAL_ADMIN=false
```

## Vývojový Supabase

```text
NEXT_PUBLIC_SUPABASE_URL=<development project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<development anon key>
SUPABASE_SERVICE_ROLE_KEY=<development service role key, server only>
```

## GoPay sandbox

```text
GOPAY_ENVIRONMENT=sandbox
GOPAY_GO_ID=<sandbox>
GOPAY_CLIENT_ID=<sandbox>
GOPAY_CLIENT_SECRET=<sandbox, server only>
GOPAY_CHECKOUT_ENABLED=false
NEXT_PUBLIC_GOPAY_ENABLED_METHODS=
```

`GOPAY_CHECKOUT_ENABLED` zůstane `false`, dokud neprojde databázový a webhook test.

## Packeta test

```text
PACKETA_ENVIRONMENT=test
PACKETA_VALIDATION_MODE=api
NEXT_PUBLIC_PACKETA_WIDGET_API_KEY=<majitelem potvrzený widget/API klíč>
PACKETA_API_ENABLED=false
PACKETA_API_PASSWORD=<potvrzené API heslo, server only>
PACKETA_SENDER=<indikace odděleného testovacího odesílatele>
PACKETA_DEFAULT_WEIGHT_KG=0.2
PACKETA_HOME_CARRIER_ID_CZ=<potvrzené ID služby>
PACKETA_HOME_CARRIER_ID_SK=<potvrzené ID služby>
```

Packeta nemá oddělený sandbox endpoint. `test` zde znamená pouze aplikační pojistku. Majitelem potvrzený původní widget/API klíč lze použít. `PACKETA_API_ENABLED` zůstane `false` do řízeného testu první zásilky, protože povolené volání může vytvořit skutečný záznam v účtu Packety. API heslo nesmí být vystavené jako `NEXT_PUBLIC_*` ani uložené v repozitáři.

## Resend test

```text
TRANSACTIONAL_EMAIL_PROVIDER=resend
TRANSACTIONAL_EMAIL_SEND_ENABLED=false
TRANSACTIONAL_EMAIL_TEST_RECIPIENT=<povolený testovací příjemce>
RESEND_API_KEY=<testovací klíč, server only>
RESEND_FROM_EMAIL=AMARÉE <objednavky@notify.amaree.cz>
TRANSACTIONAL_EMAIL_REPLY_TO=info@amaree.cz
```

Subdoména `notify.amaree.cz` je v Resendu ověřená. `TRANSACTIONAL_EMAIL_SEND_ENABLED` zůstane `false` do úspěšného staging testu omezeného přes `TRANSACTIONAL_EMAIL_TEST_RECIPIENT=info@amaree.cz`. Schránku `info@amaree.cz` nadále hostuje Active24; její heslo ani SMTP údaje se do aplikace nebo Cloudflare secrets neukládají.

Preview nesmí obsahovat žádný produkční klíč. Kontroluje to také `/api/health` podle explicitních `*_ENVIRONMENT` hodnot.
