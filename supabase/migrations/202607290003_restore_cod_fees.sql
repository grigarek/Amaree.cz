-- Keep checkout fees aligned with the approved public legal copy.
update public.payment_options
set fee_minor = 3900
where code = 'cash_on_delivery' and country = 'CZ' and currency = 'CZK';

update public.payment_options
set fee_minor = 150
where code = 'cash_on_delivery' and country = 'SK' and currency = 'EUR';
