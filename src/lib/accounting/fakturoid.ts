import "server-only";

import { FakturoidApiError, FakturoidClient, getFakturoidConfig, type FakturoidInvoiceLine } from "@/lib/accounting/fakturoid-client";
import { getFakturoidOperationalSettings } from "@/lib/admin/integration-settings";
import { getAdminOrder } from "@/lib/admin/orders";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type FakturoidTriggerSource = "payment_webhook" | "shipment" | "admin_status" | "admin_manual" | "system";

type AccountingRow = {
  id: string;
  status: "pending" | "creating" | "created" | "sent" | "failed" | "cancelled";
  remote_document_id: number | null;
  attempt_count: number;
  updated_at: string;
};

function dateOnly(value: string | Date = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function major(minor: number) {
  return (minor / 100).toFixed(2);
}

function addressPart(address: Record<string, string>, key: "street" | "city" | "postalCode") {
  return String(address[key] ?? "").trim();
}

export function buildFakturoidLines(order: Awaited<ReturnType<typeof getAdminOrder>>): FakturoidInvoiceLine[] {
  if (!order) return [];
  const lines: FakturoidInvoiceLine[] = order.lines.map((line) => ({
    name: line.variant ? `${line.name} – ${line.variant}` : line.name,
    quantity: String(line.quantity),
    unit_name: "ks",
    unit_price: major(line.unitPriceMinor)
  }));
  if (order.discountMinor > 0) lines.push({ name: order.discountCode ? `Sleva (${order.discountCode})` : "Sleva", quantity: "1", unit_name: "ks", unit_price: major(-order.discountMinor) });
  if (order.shippingMinor > 0) lines.push({ name: "Doprava – Zásilkovna", quantity: "1", unit_name: "ks", unit_price: major(order.shippingMinor) });
  if (order.paymentFeeMinor > 0) lines.push({ name: "Platební poplatek", quantity: "1", unit_name: "ks", unit_price: major(order.paymentFeeMinor) });
  return lines;
}

function paymentMethod(method: string): "bank" | "cod" | "card" {
  if (method === "cash_on_delivery") return "cod";
  if (method === "gopay") return "card";
  return "bank";
}

function language(locale: string): "cz" | "sk" | "en" | "de" {
  if (locale === "cs") return "cz";
  return locale === "sk" || locale === "de" || locale === "en" ? locale : "cz";
}

function shouldRunAutomatically(source: FakturoidTriggerSource, trigger: "manual" | "paid" | "delivered", orderStatus: string, paymentStatus: string) {
  if (source === "admin_manual") return true;
  if (trigger === "manual") return false;
  if (trigger === "paid") return source === "payment_webhook" && paymentStatus === "paid";
  return (source === "shipment" || source === "admin_status") && orderStatus === "delivered";
}

async function claimDocument(orderId: string, source: FakturoidTriggerSource) {
  const supabase = createSupabaseAdminClient();
  const { data: current, error: loadError } = await supabase.from("accounting_documents").select("id,status,remote_document_id,attempt_count,updated_at").eq("order_id", orderId).eq("provider", "fakturoid").maybeSingle();
  if (loadError) throw new Error(`fakturoid_registry_load_failed:${loadError.message}`);
  const existing = current as AccountingRow | null;
  if (existing?.status === "sent") return { claimed: false as const, row: existing };
  if (existing?.status === "creating" && Date.now() - new Date(existing.updated_at).getTime() < 10 * 60_000) return { claimed: false as const, row: existing };

  if (!existing) {
    const { data, error } = await supabase.from("accounting_documents").insert({ order_id: orderId, provider: "fakturoid", status: "creating", trigger_source: source, attempt_count: 1 }).select("id,status,remote_document_id,attempt_count,updated_at").single();
    if (!error) return { claimed: true as const, row: data as AccountingRow };
    if (error.code !== "23505") throw new Error(`fakturoid_registry_claim_failed:${error.message}`);
    return claimDocument(orderId, source);
  }

  const { data, error } = await supabase.from("accounting_documents").update({
    status: "creating",
    trigger_source: source,
    attempt_count: existing.attempt_count + 1,
    last_error_code: null,
    last_error_message: null
  }).eq("id", existing.id).neq("status", "sent").select("id,status,remote_document_id,attempt_count,updated_at").maybeSingle();
  if (error) throw new Error(`fakturoid_registry_claim_failed:${error.message}`);
  return { claimed: Boolean(data), row: (data ?? existing) as AccountingRow };
}

export async function syncFakturoidInvoice(orderId: string, options: { source: FakturoidTriggerSource; send?: boolean }) {
  const [settings, order] = await Promise.all([getFakturoidOperationalSettings(), getAdminOrder(orderId, { service: true })]);
  if (!order) return { status: "skipped" as const, reason: "order_not_found" };
  if (!settings.enabled || process.env.FAKTUROID_API_ENABLED !== "true") return { status: "skipped" as const, reason: "integration_disabled" };
  const config = getFakturoidConfig();
  if (!config) return { status: "skipped" as const, reason: "credentials_missing" };
  if (!shouldRunAutomatically(options.source, settings.automaticTrigger, order.status, order.paymentStatus)) return { status: "skipped" as const, reason: "trigger_not_matched" };
  const paymentConfirmed = order.paymentStatus === "paid" || (order.paymentMethod === "cash_on_delivery" && order.status === "delivered");
  if (!paymentConfirmed) return { status: "skipped" as const, reason: "payment_not_confirmed" };

  const claim = await claimDocument(orderId, options.source);
  if (!claim.claimed) return { status: claim.row.status === "sent" ? "sent" as const : "processing" as const, documentId: claim.row.remote_document_id };

  const supabase = createSupabaseAdminClient();
  const client = new FakturoidClient(config);
  let remoteDocumentId: number | null = claim.row.remote_document_id;
  try {
    const billing = order.billingAddress;
    const shipping = order.shippingAddress;
    const customer = await client.upsertCustomer({
      name: order.customer,
      email: order.email,
      phone: order.phone,
      street: addressPart(billing, "street"),
      city: addressPart(billing, "city"),
      zip: addressPart(billing, "postalCode"),
      country: order.shippingCountry,
      deliveryName: order.customer,
      deliveryStreet: addressPart(shipping, "street"),
      deliveryCity: addressPart(shipping, "city"),
      deliveryZip: addressPart(shipping, "postalCode"),
      deliveryCountry: order.shippingCountry
    });
    let invoice = await client.findInvoice(order.id);
    if (!invoice) {
      invoice = await client.createInvoice({
        orderId: order.id,
        subjectId: customer.id,
        currency: order.currency,
        language: language(order.locale),
        paymentMethod: paymentMethod(order.paymentMethod),
        variableSymbol: order.payments[0]?.variableSymbol,
        dueDays: settings.dueDays,
        issuedOn: dateOnly(),
        note: `Objednávka AMARÉE ${order.orderNumber}`,
        lines: buildFakturoidLines(order)
      });
    }
    remoteDocumentId = invoice.id;
    if (invoice.status !== "paid") {
      const paidAt = order.payments.find((payment) => payment.status === "paid")?.paidAt ?? order.createdAt;
      await client.markInvoicePaid(invoice.id, dateOnly(paidAt), order.payments[0]?.variableSymbol);
    }

    const { error: createdError } = await supabase.from("accounting_documents").update({
      status: "created",
      remote_subject_id: customer.id,
      remote_document_id: invoice.id,
      document_number: invoice.number,
      variable_symbol: invoice.variable_symbol,
      html_url: invoice.html_url,
      public_url: invoice.public_html_url,
      pdf_url: invoice.pdf_url,
      issued_at: new Date().toISOString(),
      last_error_code: null,
      last_error_message: null
    }).eq("id", claim.row.id);
    if (createdError) throw new Error(`fakturoid_registry_update_failed:${createdError.message}`);

    const send = options.send ?? settings.sendAutomatically;
    if (send) {
      try {
        await client.sendInvoice(invoice.id, order.email, order.orderNumber);
        await supabase.from("accounting_documents").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", claim.row.id);
        return { status: "sent" as const, documentId: invoice.id, number: invoice.number };
      } catch (sendError) {
        const error = sendError instanceof FakturoidApiError ? sendError : new FakturoidApiError("send_failed", sendError instanceof Error ? sendError.message : "Odeslání faktury se nezdařilo.", 500);
        if (/only available for paid plans/i.test(error.message)) {
          await supabase.from("accounting_documents").update({
            status: "created",
            last_error_code: null,
            last_error_message: null
          }).eq("id", claim.row.id);
          return { status: "created" as const, documentId: invoice.id, number: invoice.number, warning: "store_email_delivery" as const };
        }
        await supabase.from("accounting_documents").update({ status: "created", last_error_code: error.code, last_error_message: error.message.slice(0, 1000) }).eq("id", claim.row.id);
        return { status: "created" as const, documentId: invoice.id, number: invoice.number, warning: error.code };
      }
    }
    return { status: "created" as const, documentId: invoice.id, number: invoice.number };
  } catch (caught) {
    const error = caught instanceof FakturoidApiError ? caught : new FakturoidApiError("sync_failed", caught instanceof Error ? caught.message : "Fakturaci se nepodařilo dokončit.", 500);
    await supabase.from("accounting_documents").update({
      status: remoteDocumentId ? "created" : "failed",
      remote_document_id: remoteDocumentId,
      last_error_code: error.code,
      last_error_message: error.message.slice(0, 1000)
    }).eq("id", claim.row.id);
    throw error;
  }
}
