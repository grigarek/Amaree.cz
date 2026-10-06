# Resend transactional e-mail

Status: provider-independent transactional layer is implemented with `ResendProvider` as the active adapter. The `notify.amaree.cz` domain was verified in Resend on 19 July 2026 and the staging API key is stored as an encrypted Cloudflare secret. Sending remains disabled by `TRANSACTIONAL_EMAIL_SEND_ENABLED=false` until a controlled staging delivery test succeeds.

## Recommended identity

- sending subdomain: `notify.amaree.cz`
- From: `AMARÉE <objednavky@notify.amaree.cz>`
- Reply-To: `info@amaree.cz`
- newsletter domain remains separate, for example `novinky.amaree.cz`

The Resend dashboard generated the exact DNS values for the Ireland region. The records are active in Active24 and copied into the pending Cloudflare DNS zone:

1. MX record for the Resend return-path subdomain,
2. TXT SPF record for that same return-path,
3. TXT DKIM record, normally below `resend._domainkey.notify.amaree.cz`,
4. optional DMARC policy for `notify.amaree.cz` after SPF and DKIM verify.

Do not replace the existing MX records for the `amaree.cz` mailbox and do not create a second SPF record at the same DNS name.

## Secrets and safety

Local development uses ignored `.env.local`:

```dotenv
RESEND_API_KEY=...
TRANSACTIONAL_EMAIL_TEST_RECIPIENT=owner-test-address@example.test
```

Cloudflare uses encrypted secrets with the same names. The API key must never be put in `wrangler.jsonc`, GitHub, a Supabase table or the admin UI.

Staging requires all three conditions before a real request can leave the application:

- `TRANSACTIONAL_EMAIL_SEND_ENABLED=true`,
- `APP_ENV=staging`,
- `TRANSACTIONAL_EMAIL_TEST_RECIPIENT` is present.

The staging adapter replaces every intended customer recipient with the single allowed test recipient and prefixes the subject. Production uses the actual order recipient only after a separate production approval.

## Limits

The current Resend Free quota is 100 transactional e-mails per day and 3,000 per month. AMARÉE uses lower internal thresholds of 80 per day and 2,400 per month. At either threshold, a message remains `queued`, is visible in admin and can be retried later. Resend's API idempotency key is used in addition to the database dedupe key.

## Automatic and manual messages

Automatic system events:

- checkout: order received, awaiting online payment or awaiting bank transfer,
- verified GoPay webhook: payment confirmed, failed/expired, cancelled or refunded.

Admin-controlled messages:

- preparing, handed to carrier, parcel ready for collection, delivered, cancelled and refunded,
- complaint received/resolved and withdrawal received,
- any explicit resend after confirmation.

Packeta tracking webhooks are not yet active, so collection-ready and delivered messages remain manual until their verified status feed is implemented.

Official references:

- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://resend.com/docs/knowledge-base/account-quotas-and-limits
