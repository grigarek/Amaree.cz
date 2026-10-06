# Ecomail newsletter

Ecomail is used only for newsletter subscriptions and marketing campaigns. It is not used for transactional or order-status e-mails.

- `info@amaree.cz` remains the customer reply mailbox at Active24.
- Transactional e-mails use the provider-independent layer with Resend as the active provider.
- Newsletter consent, double opt-in, unsubscribe and synchronization must remain separate from order communication.
- The public form uses Ecomail double opt-in. A visitor is not treated as subscribed until the confirmation link is accepted.
- `ECOMAIL_NEWSLETTER_ENABLED=true` and `ECOMAIL_LIST_ID=1` are enabled on staging for the controlled acceptance test.
- `ECOMAIL_API_KEY` remains a server-only Cloudflare secret and must never be committed.
- Production stays disabled until the same form is verified on the final HTTPS domain.
