create or replace function public.reserve_order_stock(p_order_id uuid, p_expires_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  line record;
  available integer;
begin
  for line in
    select oi.inventory_item_id, sum(oi.quantity)::integer as quantity
    from public.order_items oi
    where oi.order_id = p_order_id and oi.inventory_item_id is not null
    group by oi.inventory_item_id
  loop
    perform 1 from public.inventory_items where id = line.inventory_item_id for update;
    select i.quantity - coalesce(sum(r.quantity) filter (where r.status = 'active' and (r.expires_at is null or r.expires_at > now())), 0)
      into available
      from public.inventory_items i
      left join public.stock_reservations r on r.inventory_item_id = i.id
      where i.id = line.inventory_item_id
      group by i.quantity;
    if available < line.quantity then raise exception 'insufficient_stock'; end if;
    insert into public.stock_reservations(order_id, inventory_item_id, quantity, status, expires_at)
    values (p_order_id, line.inventory_item_id, line.quantity, 'active', p_expires_at)
    on conflict (order_id, inventory_item_id) do nothing;
  end loop;
  update public.orders set reservation_expires_at = p_expires_at where id = p_order_id;
end;
$$;

create or replace function public.create_checkout_order(p_idempotency_key uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_order public.orders;
  target_order_id uuid := gen_random_uuid();
  target_order_number text;
  target_currency text;
  target_status public.order_status;
  line_data jsonb;
  product_data record;
  product_subtotal_value integer := 0;
  gift_card_value integer := 0;
  gift_card_id text := nullif(trim(p_payload->>'giftCardDesignId'), '');
  gift_card_message text;
  gift_card_color text;
  gift_card_image text;
  subtotal_value integer := 0;
  discount_value integer := 0;
  shipping_value integer := 0;
  shipping_discount_value integer := 0;
  payment_fee_value integer := 0;
  total_value integer := 0;
  shipping_option public.shipping_options;
  payment_option public.payment_options;
  discount_row public.discount_codes;
  expires_at_value timestamptz;
  payment_row_id uuid;
begin
  select * into existing_order from public.orders where idempotency_key = p_idempotency_key;
  if found then
    select id into payment_row_id from public.payments where order_id = existing_order.id order by created_at limit 1;
    return jsonb_build_object(
      'orderId', existing_order.id, 'orderNumber', existing_order.order_number,
      'paymentId', payment_row_id, 'status', existing_order.status,
      'currency', existing_order.currency, 'subtotal', existing_order.subtotal_minor,
      'discount', existing_order.discount_minor, 'shipping', existing_order.shipping_minor,
      'paymentFee', existing_order.payment_fee_minor, 'total', existing_order.total_minor,
      'duplicate', true
    );
  end if;

  if jsonb_typeof(p_payload->'lines') <> 'array' or jsonb_array_length(p_payload->'lines') = 0 then
    raise exception 'checkout_lines_required';
  end if;
  if p_payload->>'countryCode' not in ('CZ', 'SK') then raise exception 'checkout_country_invalid'; end if;
  target_currency := case when p_payload->>'countryCode' = 'CZ' then 'CZK' else 'EUR' end;

  if gift_card_id is not null then
    if gift_card_id not in (
      'dekuji-red', 'dekuji-white', 'jsi-muj-domov-white', 'jsi-to-nejlepsi-red',
      'jsi-to-nejlepsi-white', 'jsi-vyjimecny-red', 'miluji-te-red', 'miluji-te-white',
      'vsechno-nejlepsi-red', 'vsechno-nejlepsi-white'
    ) then raise exception 'gift_card_design_invalid'; end if;
    gift_card_value := case when target_currency = 'CZK' then 3000 else 120 end;
    gift_card_message := case
      when gift_card_id like 'dekuji-%' then 'Děkuju'
      when gift_card_id = 'jsi-muj-domov-white' then 'Jsi můj domov'
      when gift_card_id like 'jsi-to-nejlepsi-%' then 'Jsi to nejlepší, co mě potkalo'
      when gift_card_id = 'jsi-vyjimecny-red' then 'Jsi výjimečný/á'
      when gift_card_id like 'miluji-te-%' then 'Miluji Tě'
      else 'Všechno nejlepší k narozeninám'
    end;
    gift_card_color := case when gift_card_id like '%-red' then 'red' else 'white' end;
    gift_card_image := '/images/gift-cards/' || gift_card_id || '.png';
  end if;

  select * into shipping_option from public.shipping_options
  where code = p_payload->>'shippingMethodId' and country = p_payload->>'countryCode'
    and currency = target_currency and active;
  if not found then raise exception 'shipping_option_unavailable'; end if;
  select * into payment_option from public.payment_options
  where code = p_payload->>'paymentMethodId' and country = p_payload->>'countryCode'
    and currency = target_currency and active;
  if not found then raise exception 'payment_option_unavailable'; end if;

  for line_data in select value from jsonb_array_elements(p_payload->'lines') loop
    if coalesce((line_data->>'quantity')::integer, 0) <= 0 then raise exception 'checkout_quantity_invalid'; end if;
    select p.id, pp.amount_minor, i.id as inventory_item_id into product_data
      from public.products p
      join public.product_prices pp on pp.product_id = p.id and pp.currency = target_currency
      join public.inventory_items i on i.product_id = p.id and i.variant_id is null
      where p.id = (line_data->>'productId')::uuid and p.active and p.archived_at is null;
    if not found then raise exception 'checkout_product_unavailable'; end if;
    product_subtotal_value := product_subtotal_value + product_data.amount_minor * (line_data->>'quantity')::integer;
  end loop;
  subtotal_value := product_subtotal_value + gift_card_value;

  if nullif(upper(trim(p_payload->>'discountCode')), '') is not null then
    select * into discount_row from public.discount_codes
    where code = upper(trim(p_payload->>'discountCode')) and active
      and (currency is null or currency = target_currency)
      and (valid_from is null or valid_from <= now())
      and (valid_to is null or valid_to >= now())
      and (usage_limit is null or usage_count < usage_limit)
      and product_subtotal_value >= minimum_order_minor
    for update;
    if found then
      discount_value := case
        when discount_row.discount_type = 'percent' then floor(product_subtotal_value * discount_row.value / 100.0)::integer
        when discount_row.discount_type = 'fixed' then least(discount_row.value, product_subtotal_value)
        else 0
      end;
    end if;
  end if;

  if shipping_option.free_from_minor is not null and product_subtotal_value - discount_value >= shipping_option.free_from_minor then
    shipping_value := 0;
  elsif discount_row.id is not null and discount_row.discount_type = 'free_shipping' then
    shipping_discount_value := shipping_option.price_minor;
    shipping_value := 0;
  else shipping_value := shipping_option.price_minor;
  end if;

  payment_fee_value := payment_option.fee_minor;
  total_value := greatest(subtotal_value - discount_value + shipping_value + payment_fee_value, 0);
  target_order_number := 'A' || to_char(now(), 'YY') || '-' || lpad(nextval('public.order_number_sequence')::text, 4, '0');
  target_status := case when p_payload->>'paymentMethodId' in ('gopay', 'bank_transfer') then 'awaiting_payment'::public.order_status else 'new'::public.order_status end;
  expires_at_value := case p_payload->>'paymentMethodId' when 'gopay' then now() + interval '30 minutes' when 'bank_transfer' then now() + interval '3 days' else null end;

  insert into public.orders(
    id, order_number, idempotency_key, status, locale, currency, customer_email, customer_phone,
    customer_first_name, customer_last_name, billing_address, shipping_address, shipping_country,
    customer_note, shipping_method, payment_method, subtotal_minor, discount_minor, shipping_minor,
    payment_fee_minor, total_minor, discount_code, packeta_point_id, packeta_point_name,
    packeta_point_type, packeta_point_address, reservation_expires_at
  ) values (
    target_order_id, target_order_number, p_idempotency_key, target_status,
    coalesce(p_payload->>'locale', 'cs'), target_currency, lower(trim(p_payload->>'email')),
    nullif(trim(p_payload->>'phone'), ''), p_payload->>'firstName', p_payload->>'lastName',
    coalesce(p_payload->'billingAddress', p_payload->'shippingAddress', '{}'::jsonb),
    coalesce(p_payload->'shippingAddress', '{}'::jsonb), p_payload->>'countryCode',
    nullif(trim(p_payload->>'customerNote'), ''), p_payload->>'shippingMethodId', p_payload->>'paymentMethodId',
    subtotal_value, discount_value, shipping_value, payment_fee_value, total_value,
    case when discount_row.id is not null then discount_row.code else null end,
    nullif(p_payload->'packetaPoint'->>'id', ''), nullif(p_payload->'packetaPoint'->>'name', ''),
    nullif(p_payload->'packetaPoint'->>'type', ''), p_payload->'packetaPoint', expires_at_value
  );

  for line_data in select value from jsonb_array_elements(p_payload->'lines') loop
    select p.id, p.sku, pp.amount_minor, i.id as inventory_item_id,
      (select jsonb_object_agg(t.locale, t.name) from public.product_translations t where t.product_id = p.id) as names
      into product_data
      from public.products p
      join public.product_prices pp on pp.product_id = p.id and pp.currency = target_currency
      join public.inventory_items i on i.product_id = p.id and i.variant_id is null
      where p.id = (line_data->>'productId')::uuid and p.active and p.archived_at is null;
    insert into public.order_items(order_id, product_id, inventory_item_id, sku, name_snapshot, unit_price_minor, quantity, line_total_minor)
    values (target_order_id, product_data.id, product_data.inventory_item_id, product_data.sku, product_data.names,
      product_data.amount_minor, (line_data->>'quantity')::integer, product_data.amount_minor * (line_data->>'quantity')::integer);
  end loop;

  if gift_card_id is not null then
    insert into public.order_items(order_id, sku, name_snapshot, variant_snapshot, unit_price_minor, quantity, line_total_minor)
    values (
      target_order_id,
      'CARD-' || upper(replace(gift_card_id, '-', '_')),
      jsonb_build_object(
        'cs', 'Kartička s věnováním – ' || gift_card_message,
        'sk', 'Kartička s venovaním – ' || gift_card_message,
        'en', 'Gift message card – ' || gift_card_message,
        'de', 'Grußkarte – ' || gift_card_message
      ),
      jsonb_build_object(
        'cs', case when gift_card_color = 'red' then 'Červená varianta' else 'Bílá varianta' end,
        'sk', case when gift_card_color = 'red' then 'Červená varianta' else 'Biela varianta' end,
        'en', case when gift_card_color = 'red' then 'Red version' else 'White version' end,
        'de', case when gift_card_color = 'red' then 'Rote Variante' else 'Weiße Variante' end,
        '_kind', 'gift_card', '_designId', gift_card_id, '_imageUrl', gift_card_image
      ),
      gift_card_value, 1, gift_card_value
    );
  end if;

  perform public.reserve_order_stock(target_order_id, expires_at_value);
  if p_payload->>'paymentMethodId' = 'cash_on_delivery' then perform public.commit_order_stock(target_order_id, 'cash_on_delivery_order'); end if;

  insert into public.payments(order_id, provider, status, amount_minor, currency, variable_symbol)
  values (target_order_id, p_payload->>'paymentMethodId', 'pending', total_value, target_currency,
    case when p_payload->>'paymentMethodId' = 'bank_transfer' then regexp_replace(target_order_number, '\D', '', 'g') else null end)
  returning id into payment_row_id;
  insert into public.payment_status_history(payment_id, previous_status, new_status, source)
  values (payment_row_id, null, 'pending', 'checkout');

  if discount_row.id is not null then
    insert into public.discount_redemptions(discount_code_id, order_id, amount_minor)
    values (discount_row.id, target_order_id, discount_value + shipping_discount_value);
    update public.discount_codes set usage_count = usage_count + 1 where id = discount_row.id;
  end if;

  return jsonb_build_object(
    'orderId', target_order_id, 'orderNumber', target_order_number, 'paymentId', payment_row_id,
    'status', target_status, 'currency', target_currency, 'subtotal', subtotal_value,
    'discount', discount_value, 'shipping', shipping_value, 'paymentFee', payment_fee_value,
    'total', total_value, 'duplicate', false
  );
end;
$$;
