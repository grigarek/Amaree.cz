import "server-only";
import { randomUUID } from "node:crypto";
import { formatMoney } from "@/lib/money";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminOrder, type AdminOrderDetail } from "@/lib/admin/orders";
import { sendEcomailTransactional } from "@/lib/email/ecomail";
import type { OrderTemplateKey } from "@/lib/orders/statuses";
export { templateForOrderStatus } from "@/lib/orders/statuses";

const subjects: Record<OrderTemplateKey, Record<"cs" | "en" | "de", string>> = {
  order_received: { cs: "Objednávku jsme přijali", en: "We received your order", de: "Wir haben Ihre Bestellung erhalten" },
  awaiting_bank_transfer: { cs: "Objednávka čeká na bankovní převod", en: "Your order is awaiting bank transfer", de: "Ihre Bestellung wartet auf die Überweisung" },
  payment_confirmed: { cs: "Platbu jsme přijali", en: "We received your payment", de: "Wir haben Ihre Zahlung erhalten" },
  payment_failed: { cs: "Platba se nezdařila", en: "Payment failed", de: "Zahlung fehlgeschlagen" },
  order_processing: { cs: "Objednávku připravujeme", en: "We are preparing your order", de: "Wir bereiten Ihre Bestellung vor" },
  ready_for_pickup: { cs: "Objednávka je připravena k vyzvednutí", en: "Your order is ready for pickup", de: "Ihre Bestellung ist abholbereit" },
  order_shipped: { cs: "Objednávku jsme odeslali", en: "Your order has shipped", de: "Ihre Bestellung wurde versendet" },
  order_cancelled: { cs: "Objednávka byla zrušena", en: "Your order was cancelled", de: "Ihre Bestellung wurde storniert" },
  payment_refunded: { cs: "Platbu jsme vrátili", en: "Your payment was refunded", de: "Ihre Zahlung wurde erstattet" }
};

export function buildOrderStatusEmail(order: AdminOrderDetail, templateKey: OrderTemplateKey) {
  const locale = order.locale;
  const subject = `${subjects[templateKey][locale]} – ${order.orderNumber}`;
  const intro: Record<OrderTemplateKey, Record<typeof locale, string>> = {
    order_received: { cs: "Děkujeme. Vaši objednávku jsme přijali.", en: "Thank you. We received your order.", de: "Vielen Dank. Wir haben Ihre Bestellung erhalten." },
    awaiting_bank_transfer: { cs: "Objednávku odešleme po přijetí bankovního převodu.", en: "We will ship the order after receiving your bank transfer.", de: "Wir versenden nach Eingang Ihrer Überweisung." },
    payment_confirmed: { cs: "Platbu jsme přijali a objednávka může pokračovat ke zpracování.", en: "We received your payment and will continue processing the order.", de: "Wir haben Ihre Zahlung erhalten und bearbeiten die Bestellung weiter." },
    payment_failed: { cs: "Platbu se nepodařilo potvrdit. Kontaktujte nás prosím.", en: "We could not confirm the payment. Please contact us.", de: "Die Zahlung konnte nicht bestätigt werden. Bitte kontaktieren Sie uns." },
    order_processing: { cs: "Vaše šperky právě pečlivě připravujeme.", en: "We are carefully preparing your jewelry.", de: "Wir bereiten Ihren Schmuck sorgfältig vor." },
    ready_for_pickup: { cs: "Objednávka je připravena k osobnímu vyzvednutí.", en: "Your order is ready for personal pickup.", de: "Ihre Bestellung ist zur Abholung bereit." },
    order_shipped: { cs: "Zásilku jsme předali dopravci.", en: "We handed your parcel to the carrier.", de: "Wir haben Ihr Paket dem Versanddienstleister übergeben." },
    order_cancelled: { cs: "Vaše objednávka byla zrušena.", en: "Your order has been cancelled.", de: "Ihre Bestellung wurde storniert." },
    payment_refunded: { cs: "Vrácení platby jsme zpracovali.", en: "We processed your refund.", de: "Wir haben Ihre Rückerstattung bearbeitet." }
  };
  const lines = [intro[templateKey][locale], "", `Objednávka: ${order.orderNumber}`];
  order.lines.forEach((line) => lines.push(`${line.quantity}× ${line.name} – ${formatMoney(line.lineTotalMinor, locale, order.currency)}`));
  lines.push(`Celkem: ${formatMoney(order.totalMinor, locale, order.currency)}`);
  if (templateKey === "order_shipped") {
    if (!order.shipment?.trackingNumber || !order.shipment.trackingUrl) throw new Error("shipment_tracking_missing");
    lines.push("", "Dopravce: Packeta", `Tracking: ${order.shipment.trackingNumber}`, order.shipment.trackingUrl);
  }
  lines.push("", "AMARÉE", "info@amaree.cz");
  const text = lines.join("\n");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#171313"><h1 style="font-family:Georgia,serif;color:#bc2227">${subject}</h1>${text.split("\n").map((line) => line ? `<p>${line.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>` : "<br>").join("")}</div>`;
  return { subject, text, html, templateKey };
}

export async function sendOrderStatusEmail(orderId: string, templateKey: OrderTemplateKey, options: { manualResend?: boolean } = {}) {
  const order = await getAdminOrder(orderId, { service: true });
  if (!order) throw new Error("order_not_found");
  const content = buildOrderStatusEmail(order, templateKey);
  const dedupeKey = options.manualResend
    ? `order:${order.id}:${templateKey}:manual:${randomUUID()}`
    : `order:${order.id}:${templateKey}`;
  const supabase = createSupabaseAdminClient();
  const { data: email, error: insertError } = await supabase.from("email_messages").insert({
    order_id: order.id,
    template_key: templateKey,
    recipient: order.email,
    locale: order.locale,
    subject: content.subject,
    dedupe_key: dedupeKey,
    status: "queued",
    payload: { orderNumber: order.orderNumber, manualResend: Boolean(options.manualResend) }
  }).select("id").single();
  if (insertError) {
    if (insertError.code === "23505") {
      const { data: existing } = await supabase.from("email_messages").select("id,status").eq("dedupe_key", dedupeKey).maybeSingle();
      return { status: "duplicate" as const, messageId: existing?.id ?? null, existingStatus: existing?.status ?? null };
    }
    throw new Error(insertError.message);
  }

  try {
    const result = await sendEcomailTransactional({
      to: order.email,
      toName: order.customer,
      subject: content.subject,
      text: content.text,
      html: content.html,
      metadata: { order_id: order.id, order_number: order.orderNumber, template: templateKey }
    });
    await supabase.from("email_messages").update({
      status: result.mode === "sent" ? "sent" : "queued",
      provider_message_id: result.providerMessageId,
      sent_at: result.mode === "sent" ? new Date().toISOString() : null
    }).eq("id", email.id);
    return { status: result.mode, messageId: email.id };
  } catch (error) {
    await supabase.from("email_messages").update({ status: "failed", error_message: error instanceof Error ? error.message : "send_failed" }).eq("id", email.id);
    throw error;
  }
}
