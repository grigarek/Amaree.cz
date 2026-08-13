import "server-only";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { orderStatuses, type AdminOrderStatus } from "@/lib/orders/statuses";
import type { OrderTermsSnapshot } from "@/lib/email/order-terms";
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
  firstName: string;
  lastName: string;
  locale: "cs" | "sk" | "en" | "de";
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
  reservationExpiresAt: string | null;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  termsSnapshot: OrderTermsSnapshot | null;
  packetaPoint: { id: string | null; name: string | null; type: string | null; address: Record<string, string> | null };
  lines: Array<{ id: string; sku: string; name: string; variant: string | null; imageUrl: string | null; unitPriceMinor: number; quantity: number; lineTotalMinor: number }>;
  payments: Array<{ id: string; provider: string; providerPaymentId: string | null; status: string; amountMinor: number; variableSymbol: string | null; checkoutUrl: string | null; paidAt: string | null; createdAt: string }>;
  accountingDocument: { id: string; status: string; documentNumber: string | null; variableSymbol: string | null; htmlUrl: string | null; publicUrl: string | null; pdfUrl: string | null; issuedAt: string | null; sentAt: string | null; errorCode: string | null; errorMessage: string | null } | null;
  shipment: { id: string; status: string; providerPacketId: string | null; trackingNumber: string | null; trackingUrl: string | null; labelStoragePath: string | null } | null;
  history: Array<{ id: number; previousStatus: string | null; newStatus: string; actorUserId: string | null; note: string | null; emailRequested: boolean; emailMessageId: string | null; createdAt: string }>;
  emails: Array<{ id: string; templateKey: string; recipient: string; subject: string; text: string; html: string; provider: string; providerMessageId: string | null; status: string; sentAt: string | null; createdAt: string; errorMessage: string | null; triggeredBy: string | null; triggerSource: string; attemptCount: number }>;
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
  const payments = (row.payments as Array<Record<string, unknown>>).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const shipments = row.shipments as Array<Record<string, unknown>>;
  const history = row.order_status_history as Array<Record<string, unknown>>;
  const emails = row.email_messages as Array<Record<string, unknown>>;
  const productIds = [...new Set(items.map((item) => item.product_id).filter(Boolean).map(String))];
  const imageByProductId = new Map<string, string>();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://amaree.cz").replace(/\/$/, "");
  if (productIds.length > 0) {
    const { data: imageRows, error: imageError } = await supabase
      .from("product_images")
      .select("product_id,storage_path,is_primary,sort_order")
      .in("product_id", productIds)
      .is("archived_at", null)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });
    if (imageError) throw new Error(`Order product images could not be loaded: ${imageError.message}`);
    for (const image of imageRows ?? []) {
      const productId = String(image.product_id);
      if (imageByProductId.has(productId)) continue;
      const { data: publicImage } = supabase.storage.from("product-images").getPublicUrl(image.storage_path);
      imageByProductId.set(productId, publicImage.publicUrl);
    }
  }
  const { data: auditRows, error: auditError } = await supabase.from("admin_audit_log").select("id,actor_user_id,action,old_values,new_values,created_at").eq("entity_table", "orders").eq("entity_id", id).order("created_at", { ascending: false }).limit(100);
  if (auditError) throw new Error(`Order audit could not be loaded: ${auditError.message}`);
  const { data: accountingRow, error: accountingError } = await supabase
    .from("accounting_documents")
    .select("id,status,document_number,variable_symbol,html_url,public_url,pdf_url,issued_at,sent_at,last_error_code,last_error_message")
    .eq("order_id", id)
    .eq("provider", "fakturoid")
    .maybeSingle();
  if (accountingError && !["42P01", "PGRST205"].includes(accountingError.code ?? "")) throw new Error(`Accounting document could not be loaded: ${accountingError.message}`);

  return {
    id: row.id,
    orderNumber: row.order_number,
    customer: `${row.customer_first_name} ${row.customer_last_name}`,
    firstName: row.customer_first_name,
    lastName: row.customer_last_name,
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
    reservationExpiresAt: row.reservation_expires_at,
    termsAcceptedAt: row.terms_accepted_at ?? null,
    termsVersion: row.terms_version ?? null,
    termsSnapshot: (row.terms_snapshot as OrderTermsSnapshot | null | undefined) ?? null,
    packetaPoint: { id: row.packeta_point_id, name: row.packeta_point_name, type: row.packeta_point_type, address: row.packeta_point_address },
    lines: items.map((item) => ({
      id: String(item.id), sku: String(item.sku), name: (item.name_snapshot as Record<string, string>)[row.locale] ?? (item.name_snapshot as Record<string, string>).cs,
      variant: item.variant_snapshot ? String((item.variant_snapshot as Record<string, string>)[row.locale] ?? "") : null,
      imageUrl: item.product_id
        ? imageByProductId.get(String(item.product_id)) ?? null
        : typeof (item.variant_snapshot as Record<string, unknown> | null)?._imageUrl === "string"
          ? `${siteUrl}${String((item.variant_snapshot as Record<string, unknown>)._imageUrl)}`
          : null,
      unitPriceMinor: Number(item.unit_price_minor), quantity: Number(item.quantity), lineTotalMinor: Number(item.line_total_minor)
    })),
    payments: payments.map((payment) => {
      const providerPayload = payment.provider_payload as Record<string, unknown> | null;
      const checkoutUrl = typeof providerPayload?.gw_url === "string" && providerPayload.gw_url.startsWith("https://")
        ? providerPayload.gw_url
        : null;
      return {
        id: String(payment.id), provider: String(payment.provider), providerPaymentId: payment.provider_payment_id ? String(payment.provider_payment_id) : null,
        status: String(payment.status), amountMinor: Number(payment.amount_minor), variableSymbol: payment.variable_symbol ? String(payment.variable_symbol) : null,
        checkoutUrl, paidAt: payment.paid_at ? String(payment.paid_at) : null, createdAt: String(payment.created_at)
      };
    }),
    accountingDocument: accountingRow ? {
      id: String(accountingRow.id), status: String(accountingRow.status), documentNumber: accountingRow.document_number ? String(accountingRow.document_number) : null,
      variableSymbol: accountingRow.variable_symbol ? String(accountingRow.variable_symbol) : null, htmlUrl: accountingRow.html_url ? String(accountingRow.html_url) : null,
      publicUrl: accountingRow.public_url ? String(accountingRow.public_url) : null, pdfUrl: accountingRow.pdf_url ? String(accountingRow.pdf_url) : null,
      issuedAt: accountingRow.issued_at ? String(accountingRow.issued_at) : null, sentAt: accountingRow.sent_at ? String(accountingRow.sent_at) : null,
      errorCode: accountingRow.last_error_code ? String(accountingRow.last_error_code) : null, errorMessage: accountingRow.last_error_message ? String(accountingRow.last_error_message) : null
    } : null,
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
      provider: String(email.provider ?? "resend"), providerMessageId: email.provider_message_id ? String(email.provider_message_id) : null,
      createdAt: String(email.created_at), errorMessage: email.error_message ? String(email.error_message) : null,
      triggeredBy: email.triggered_by ? String(email.triggered_by) : null, triggerSource: String(email.trigger_source ?? "system"), attemptCount: Number(email.attempt_count ?? 0)
    })),
    audit: (auditRows ?? []).map((entry) => ({ id: Number(entry.id), action: entry.action, actorUserId: entry.actor_user_id, oldValues: entry.old_values, newValues: entry.new_values, createdAt: entry.created_at }))
  };
}
