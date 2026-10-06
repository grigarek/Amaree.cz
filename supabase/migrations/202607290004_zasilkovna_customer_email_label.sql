-- Keep the Czech customer-facing brand name aligned with the storefront.

begin;

update public.integration_settings
set value = jsonb_set(
  value,
  '{templates,order_shipped,introCs}',
  to_jsonb('Zásilku jsme předali Zásilkovně. Její cestu můžete sledovat přes odkaz níže.'::text),
  true
)
where key = 'order_email_templates';

commit;
