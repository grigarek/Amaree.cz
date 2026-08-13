begin;

update public.shipping_options
set active = false
where code = 'personal_pickup';

update public.payment_options
set active = false
where code = 'cash_on_pickup';

commit;
