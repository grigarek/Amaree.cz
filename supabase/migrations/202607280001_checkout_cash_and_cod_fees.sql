begin;

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('gopay', 'cash_on_delivery', 'cash_on_pickup', 'bank_transfer'));

alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments add constraint payments_provider_check
  check (provider in ('gopay', 'cash_on_delivery', 'cash_on_pickup', 'bank_transfer'));

alter table public.payment_options drop constraint if exists payment_options_code_check;
alter table public.payment_options add constraint payment_options_code_check
  check (code in ('gopay', 'cash_on_delivery', 'cash_on_pickup', 'bank_transfer'));

update public.payment_options
set fee_minor = 4500, active = true
where code = 'cash_on_delivery' and country = 'CZ' and currency = 'CZK';

update public.payment_options
set fee_minor = 200, active = true
where code = 'cash_on_delivery' and country = 'SK' and currency = 'EUR';

insert into public.payment_options (code, country, currency, fee_minor, active)
values ('cash_on_pickup', 'CZ', 'CZK', 0, true)
on conflict (code, country, currency) do update
set fee_minor = excluded.fee_minor, active = excluded.active;

insert into public.payment_options (code, country, currency, fee_minor, active)
values ('cash_on_pickup', 'SK', 'EUR', 0, false)
on conflict (code, country, currency) do update
set fee_minor = excluded.fee_minor, active = excluded.active;

commit;
