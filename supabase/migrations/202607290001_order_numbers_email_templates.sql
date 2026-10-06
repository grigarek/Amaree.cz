-- Short public order numbers and editable order e-mail copy.
-- Existing order numbers remain unchanged; only newly inserted orders are normalized.

begin;

create or replace function public.set_short_order_number()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  sequence_value text;
begin
  if new.order_number ~ '^AMR-[0-9]{4}-[0-9]+$' then
    sequence_value := (regexp_match(new.order_number, '([0-9]+)$'))[1];
    new.order_number := 'A' || to_char(coalesce(new.created_at, now()), 'YY') || '-' || lpad((sequence_value::bigint)::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists orders_short_order_number on public.orders;
create trigger orders_short_order_number
  before insert on public.orders
  for each row execute function public.set_short_order_number();

create or replace function public.set_bank_transfer_variable_symbol()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  public_number text;
begin
  if new.provider = 'bank_transfer' then
    select order_number into public_number from public.orders where id = new.order_id;
    if public_number is not null then
      new.variable_symbol := right(regexp_replace(public_number, '\D', '', 'g'), 10);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_bank_transfer_variable_symbol on public.payments;
create trigger payments_bank_transfer_variable_symbol
  before insert on public.payments
  for each row execute function public.set_bank_transfer_variable_symbol();

insert into public.integration_settings(key, value, description)
values (
  'order_email_templates',
  jsonb_build_object(
    'templates', jsonb_build_object(
      'order_received', jsonb_build_object(
        'subjectCs', 'Objednávku jsme přijali', 'statusCs', 'Objednávka přijata',
        'introCs', 'Děkujeme za vaši objednávku. Níže najdete její potvrzený souhrn.',
        'subjectSk', 'Objednávku sme prijali', 'statusSk', 'Objednávka prijatá',
        'introSk', 'Ďakujeme za vašu objednávku. Nižšie nájdete jej potvrdený súhrn.'
      ),
      'order_shipped', jsonb_build_object(
        'subjectCs', 'Zásilka byla předána dopravci', 'statusCs', 'Předáno dopravci',
        'introCs', 'Zásilku jsme předali Zásilkovně. Její cestu můžete sledovat přes odkaz níže.',
        'subjectSk', 'Zásielka bola odovzdaná dopravcovi', 'statusSk', 'Odovzdané dopravcovi',
        'introSk', 'Zásielku sme odovzdali dopravcovi Packeta. Jej cestu môžete sledovať cez odkaz nižšie.'
      ),
      'order_delivered', jsonb_build_object(
        'subjectCs', 'Objednávka byla doručena', 'statusCs', 'Doručeno',
        'introCs', 'Vaše objednávka byla úspěšně doručena. Věříme, že vám šperk AMARÉE udělá radost.',
        'subjectSk', 'Objednávka bola doručená', 'statusSk', 'Doručené',
        'introSk', 'Vaša objednávka bola úspešne doručená. Veríme, že vám šperk AMARÉE urobí radosť.'
      )
    ),
    'review', jsonb_build_object(
      'enabled', false, 'url', '',
      'headingCs', 'Podělte se o svou zkušenost',
      'textCs', 'Budeme rádi za vaše hodnocení. Pomůže nám dál zdokonalovat AMARÉE a ostatním zákazníkům usnadní výběr šperku.',
      'buttonCs', 'Ohodnotit AMARÉE',
      'headingSk', 'Podeľte sa o svoju skúsenosť',
      'textSk', 'Budeme radi za vaše hodnotenie. Pomôže nám ďalej zdokonaľovať AMARÉE a ostatným zákazníkom uľahčí výber šperku.',
      'buttonSk', 'Ohodnotiť AMARÉE'
    )
  ),
  'Editable order e-mail copy and optional Google review request. Layout remains code-managed.'
)
on conflict (key) do nothing;

commit;
