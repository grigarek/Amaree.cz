create or replace function public.claim_packeta_shipment_creation(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders;
  shipment_row public.shipments;
  payment_confirmed boolean := false;
begin
  select * into order_row from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if order_row.shipping_method not like 'packeta_%' then raise exception 'order_is_not_packeta'; end if;
  if order_row.status in ('cancelled', 'refunded', 'archived') then raise exception 'order_not_fulfillable'; end if;

  payment_confirmed := case
    when order_row.payment_method = 'cash_on_delivery' then true
    when order_row.payment_method = 'gopay' then exists (
      select 1 from public.payments where order_id = p_order_id and provider = 'gopay' and status = 'paid'
    )
    when order_row.payment_method = 'bank_transfer' then order_row.status in ('paid', 'processing')
    else false
  end;
  if not payment_confirmed then raise exception 'order_payment_not_confirmed'; end if;

  insert into public.shipments(order_id, status)
  values (p_order_id, 'creating')
  on conflict (order_id, provider) do nothing
  returning * into shipment_row;
  if found then
    return jsonb_build_object('claimed', true, 'shipmentId', shipment_row.id);
  end if;

  select * into shipment_row
  from public.shipments
  where order_id = p_order_id and provider = 'packeta'
  for update;

  if shipment_row.provider_packet_id is not null then
    return jsonb_build_object(
      'claimed', false,
      'shipmentId', shipment_row.id,
      'status', shipment_row.status,
      'providerPacketId', shipment_row.provider_packet_id
    );
  end if;
  if shipment_row.status = 'creating' and shipment_row.updated_at >= now() - interval '5 minutes' then
    return jsonb_build_object('claimed', false, 'shipmentId', shipment_row.id, 'status', shipment_row.status);
  end if;

  update public.shipments
  set status = 'creating', provider_payload = provider_payload - 'last_error'
  where id = shipment_row.id;
  return jsonb_build_object('claimed', true, 'shipmentId', shipment_row.id);
end;
$$;

revoke all on function public.claim_packeta_shipment_creation(uuid) from public;
grant execute on function public.claim_packeta_shipment_creation(uuid) to service_role;
