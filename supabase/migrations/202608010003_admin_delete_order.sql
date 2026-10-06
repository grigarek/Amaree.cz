begin;

create or replace function public.admin_delete_order(
  p_order_id uuid,
  p_confirmation text
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  order_row public.orders;
  redemption_row record;
begin
  if not public.is_admin_user(array['admin'::public.admin_role]) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select * into order_row
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if trim(coalesce(p_confirmation, '')) <> order_row.order_number then
    raise exception 'order_confirmation_mismatch';
  end if;

  if order_row.status <> 'cancelled' then
    raise exception 'order_must_be_cancelled';
  end if;

  if exists (
    select 1
    from public.payments
    where order_id = p_order_id
      and (
        status in ('paid', 'refunded')
        or provider_payment_id is not null
        or paid_at is not null
      )
  ) then
    raise exception 'order_has_payment_record';
  end if;

  if exists (select 1 from public.inventory_movements where order_id = p_order_id) then
    raise exception 'order_has_stock_movement';
  end if;

  if exists (
    select 1
    from public.shipments
    where order_id = p_order_id
      and (
        provider_packet_id is not null
        or tracking_number is not null
        or status not in ('draft', 'cancelled')
      )
  ) then
    raise exception 'order_has_shipment';
  end if;

  if exists (select 1 from public.complaints where order_id = p_order_id) then
    raise exception 'order_has_complaint';
  end if;

  perform public.release_order_stock(p_order_id, false);

  for redemption_row in
    select discount_code_id
    from public.discount_redemptions
    where order_id = p_order_id
  loop
    update public.discount_codes
    set usage_count = greatest(usage_count - 1, 0)
    where id = redemption_row.discount_code_id;
  end loop;

  delete from public.orders where id = p_order_id;
  return order_row.order_number;
end;
$$;

revoke all on function public.admin_delete_order(uuid, text) from public, anon;
grant execute on function public.admin_delete_order(uuid, text) to authenticated;

commit;
