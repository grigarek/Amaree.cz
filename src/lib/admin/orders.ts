import "server-only";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { orderStatuses, type AdminOrderStatus } from "@/lib/orders/statuses";
export { orderStatuses, orderStatusLabels, type AdminOrderStatus } from "@/lib/orders/statuses";

export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  items: string;
  totalMinor: number;
  currency: "CZK" | "EUR";
  paymentMethod: string;
  paymentStatus: string;
  shippingMethod: string;
  status: AdminOrderStatus;
  createdAt: string;
};

export type AdminOrderDetail = AdminOrderListItem & {
  locale: "cs" | "en" | "de";
  phone: string | null;
  billingAddress: Record<string, string>;
  shippingAddress: Record<string, string>;
  shippingCountry: "CZ" | "SK";
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  paymentFeeMinor: number;
  discountCode: string | null;
  customerNote: string | null;
  internalNote: string | null;
  packetaPoint: { id: string | null; name: string | null; type: string | null; address: Record<string, string> | null };
  lines: Array<{ id: string; sku: string; name: string; variant: string | null; unitPriceMinor: number; quantity: number; lineTotalMinor: number }>;
  payments: Array<{ id: string; provider: string; providerPaymentId: string | null; status: string; amountMinor: number; createdAt: string }>;
  shipment: { id: string; status: string; providerPacketId: string | null; trackingNumber: string | null; trackingUrl: string | null; labelStoragePath: string | null } | null;
  history: Array<{ id: number; previousStatus: string | null; newStatus: string; actorUserId: string | null; note: string | null; emailRequested: boolean; emailMessageId: string | null; createdAt: string }>;
  emails: Array<{ id: string; templateKey: string; recipient: string; subject: string; text: string; html: string; status: string; sentAt: string | null; createdAt: string; errorMessage: string | null }>;
  audit: Array<{ id: number; action: string; actorUserId: string | null; oldValues: Record<string, unknown> | null; newValues: Record<string, unknown> | null; createdAt: string }>;
};

export async function listAdminOrders(search = "", status = "all"): Promise<AdminOrderListItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("orders").select(`
    id,order_number,status,currency,customer_email,customer_first_name,customer_last_name,total_minor,
    payment_method,shipping_method,created_at,order_items(sku,name_snapshot,quantity),payments(status)
  `).order("created_at", { ascending: false }).limit(250);
  if (status !== "all" && orderStatuses.includes(status as AdminOrderStatus)) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(`Orders could not be loaded: ${error.message}`);
  const needle = search.trim().toLocaleLowerCase("cs");
  return (data ?? []).map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    customer: `${row.customer_first_name} ${row.customer_last_name}`,
    email: row.customer_email,
    items: (row.order_items as Array<{ name_snapshot: Record<string, string>; quantity: number }>).map((item) => `${item.quantity}× ${item.name_snapshot.cs ?? Object.values(item.name_snapshot)[0] ?? "Produkt"}`).join(", "),
    totalMinor: row.total_minor,
    currency: row.currency as "CZK" | "EUR",
    paymentMethod: row.payment_method,
    paymentStatus: (row.payments as Array<{ status: string }>)[0]?.status ?? "pending",
    shippingMethod: row.shipping_method,
    status: row.status as AdminOrderStatus,
    createdAt: row.created_at
  })).filter((order) => !needle || [order.orderNumber, order.customer, order.email, order.items].some((value) => value.toLocaleLowerCase("cs").includes(needle)));
}

export async function getAdminOrder(id: string, options: { service?: boolean } = {}): Promise<AdminOrderDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = options.service ? createSupabaseAdminClient() : await createSupabaseServerClient();
  const { data: row, error } = await supabase.from("orders").select(`
    *,order_items(*),payments(*),shipments(*),order_status_history(*),email_messages(*)
  `).eq("id", id).maybeSingle();
  if (error) throw new Error(`Order could not be loaded: ${error.message}`);
  if (!row) return null;
  const items = row.order_items as Array<Record<string, unknown>>;
  const payments = row.payments as Array<Record<string, unknown>>;
  const shipments = row.shipments as Array<Record<string, unknown>>;
  const history = row.order_status_history as Array<Record<string, unknown>>;
  const emails = row.email_messages as Array<Record<string, unknown>>;
  const { data: auditRows, error: auditError } = await supabase.from("admin_audit_log").select("id,actor_user_id,action,old_values,new_values,created_at").eq("entity_table", "orders").eq("entity_id", id).order("created_at", { ascending: false }).limit(100);
  if (auditError) throw new Error(`Order audit could not be loaded: ${auditError.message}`);

  return {
    id: row.id,
    orderNumber: row.order_number,
    customer: `${row.customer_first_name} ${row.customer_last_name}`,
    email: row.customer_email,
    phone: row.customer_phone,
    items: items.map((item) => `${item.quantity}× ${(item.name_snapshot as Record<string, string>).cs ?? "Produkt"}`).join(", "),
    totalMinor: row.total_minor,
    currency: row.currency,
    paymentMethod: row.payment_method,
    paymentStatus: String(payments[0]?.status ?? "pending"),
    shippingMethod: row.shipping_method,
    status: row.status,
    createdAt: row.created_at,
    locale: row.locale,
    billingAddress: row.billing_address,
    shippingAddress: row.shipping_address,
    shippingCountry: row.shipping_country,
    subtotalMinor: row.subtotal_minor,
    discountMinor: row.discount_minor,
    shippingMinor: row.shipping_minor,
    paymentFeeMinor: row.payment_fee_minor,
    discountCode: row.discount_code,
    customerNote: row.customer_note,
    internalNote: row.internal_note,
    packetaPoint: { id: row.packeta_point_id, name: row.packeta_point_name, type: row.packeta_point_type, address: row.packeta_point_address },
    lines: items.map((item) => ({
      id: String(item.id), sku: String(item.sku), name: (item.name_snapshot as Record<string, string>)[row.locale] ?? (item.name_snapshot as Record<string, string>).cs,
      variant: item.variant_snapshot ? String((item.variant_snapshot as Record<string, string>)[row.locale] ?? "") : null,
      unitPriceMinor: Number(item.unit_price_minor), quantity: Number(item.quantity), lineTotalMinor: Number(item.line_total_minor)
    })),
    payments: payments.map((payment) => ({
      id: String(payment.id), provider: String(payment.provider), providerPaymentId: payment.provider_payment_id ? String(payment.provider_payment_id) : null,
      status: String(payment.status), amountMinor: Number(payment.amount_minor), createdAt: String(payment.created_at)
    })),
    shipment: shipments[0] ? {
      id: String(shipments[0].id), status: String(shipments[0].status), providerPacketId: shipments[0].provider_packet_id ? String(shipments[0].provider_packet_id) : null,
      trackingNumber: shipments[0].tracking_number ? String(shipments[0].tracking_number) : null, trackingUrl: shipments[0].tracking_url ? String(shipments[0].tracking_url) : null,
      labelStoragePath: shipments[0].label_storage_path ? String(shipments[0].label_storage_path) : null
    } : null,
    history: history.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).map((entry) => ({
      id: Number(entry.id), previousStatus: entry.previous_status ? String(entry.previous_status) : null, newStatus: String(entry.new_status), actorUserId: entry.actor_user_id ? String(entry.actor_user_id) : null,
      note: entry.note ? String(entry.note) : null, emailRequested: Boolean(entry.email_requested), emailMessageId: entry.email_message_id ? String(entry.email_message_id) : null, createdAt: String(entry.created_at)
    })),
    emails: emails.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).map((email) => ({
      id: String(email.id), templateKey: String(email.template_key), recipient: String(email.recipient), subject: String(email.subject), status: String(email.status),
      text: String(email.body_text), html: String(email.body_html), sentAt: email.sent_at ? String(email.sent_at) : null,
      createdAt: String(email.created_at), errorMessage: email.error_message ? String(email.error_message) : null
    })),
    audit: (auditRows ?? []).map((entry) => ({ id: Number(entry.id), action: entry.action, actorUserId: entry.actor_user_id, oldValues: entry.old_values, newValues: entry.new_values, createdAt: entry.created_at }))
  };
}
