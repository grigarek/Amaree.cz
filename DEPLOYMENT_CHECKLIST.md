# AMARÉE deployment checklist

## Technical

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Supabase migrations applied
- [ ] Supabase Storage bucket configured
- [ ] Stripe webhook configured and verified
- [ ] Resend domain verified
- [ ] Vercel environment variables configured
- [ ] Production domain connected

## Content

- [ ] Product names verified
- [ ] Prices verified in CZK
- [ ] Stock quantities verified
- [ ] Photos uploaded to owned storage
- [ ] Czech copy approved
- [ ] English copy reviewed
- [ ] German copy reviewed
- [ ] Legal documents completed

## Launch

- [ ] Test order paid successfully
- [ ] Duplicate webhook does not double-process order
- [ ] Inventory decrements only after paid webhook
- [ ] Confirmation e-mail delivered
- [ ] Admin access restricted to configured e-mails
- [ ] Cookie consent blocks analytics until consent
