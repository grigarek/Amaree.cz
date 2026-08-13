import "server-only";
import { company } from "@/lib/config/company";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminOrder, type AdminOrderDetail } from "@/lib/admin/orders";
import { deliverRecordedEmail } from "@/lib/email/delivery";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function money(amountMinor: number, currency: "CZK" | "EUR") {
  return new Intl.NumberFormat(currency === "EUR" ? "sk-SK" : "cs-CZ", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "EUR" ? 2 : 0,
    maximumFractionDigits: currency === "EUR" ? 2 : 0
  }).format(amountMinor / 100);
}

function paymentName(value: string) {
  return ({
    gopay: "Online platba kartou",
    bank_transfer: "Bankovní převod",
    cash_on_delivery: "Platba na dobírku"
  } as Record<string, string>)[value] ?? value;
}

function shippingName(value: string) {
  return ({
    packeta_home: "Zásilkovna – doručení na adresu",
    packeta_pickup: "Zásilkovna – výdejní místo nebo Z-BOX"
  } as Record<string, string>)[value] ?? value;
}

function formatAddress(value: Record<string, string>) {
  return [value.street, `${value.postalCode ?? ""} ${value.city ?? ""}`.trim(), value.countryCode].filter(Boolean).join(", ");
}

export function buildMerchantNewOrderEmail(order: AdminOrderDetail, siteUrl: string) {
  const subject = `Nová objednávka – ${order.orderNumber}`;
  const adminUrl = `${siteUrl.replace(/\/$/, "")}/admin/orders/${encodeURIComponent(order.id)}`;
  const lines = order.lines.map((line) => `${line.quantity}× ${line.name} – ${money(line.lineTotalMinor, order.currency)}`);
  const text = [
    "Nová objednávka AMARÉE",
    "",
    `Objednávka: ${order.orderNumber}`,
    `Zákazník: ${order.customer}`,
    `E-mail: ${order.email}`,
    `Telefon: ${order.phone ?? "Neuveden"}`,
    `Platba: ${paymentName(order.paymentMethod)}`,
    `Doprava: ${shippingName(order.shippingMethod)}`,
    `Dodací adresa: ${formatAddress(order.shippingAddress)}`,
    "",
    "Produkty:",
    ...lines,
    "",
    `Celkem: ${money(order.totalMinor, order.currency)}`,
    "",
    `Otevřít objednávku v administraci: ${adminUrl}`
  ].join("\n");
  const productRows = order.lines.map((line) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eadfe0">${line.quantity}× ${escapeHtml(line.name)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #eadfe0;white-space:nowrap">${escapeHtml(money(line.lineTotalMinor, order.currency))}</td></tr>`).join("");
  const html = `<!doctype html><html lang="cs"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#f7f4f3;font-family:Arial,sans-serif;color:#171313"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #eadfe0"><tr><td style="height:7px;background:#bc2227"></td></tr><tr><td align="center" style="padding:26px 24px 18px"><div style="font-family:Georgia,serif;font-size:29px;letter-spacing:4px;color:#bc2227">AMARÉE</div><div style="margin-top:7px;font-size:9px;letter-spacing:3px;color:#bc2227">EST. 2025</div></td></tr><tr><td style="padding:12px 32px 34px"><h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:29px;font-weight:400">Nová objednávka</h1><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.65"><tr><td style="padding:16px;background:#f8eeee"><strong>${escapeHtml(order.orderNumber)}</strong><br>${escapeHtml(order.customer)}<br><a href="mailto:${escapeHtml(order.email)}" style="color:#bc2227">${escapeHtml(order.email)}</a> · ${escapeHtml(order.phone ?? "Telefon neuveden")}</td></tr></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;font-size:14px;line-height:1.55">${productRows}<tr><td style="padding-top:14px;font-weight:700">Celkem</td><td align="right" style="padding-top:14px;font-weight:700">${escapeHtml(money(order.totalMinor, order.currency))}</td></tr></table><p style="margin:22px 0 0;font-size:14px;line-height:1.7"><strong>Platba:</strong> ${escapeHtml(paymentName(order.paymentMethod))}<br><strong>Doprava:</strong> ${escapeHtml(shippingName(order.shippingMethod))}<br><strong>Adresa:</strong> ${escapeHtml(formatAddress(order.shippingAddress))}</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px"><tr><td bgcolor="#bc2227"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:13px 20px;color:#fff;text-decoration:none;font-size:14px;font-weight:700">Otevřít objednávku</a></td></tr></table></td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html, adminUrl };
}

export async function sendMerchantNewOrderEmail(orderId: string, siteUrl: string) {
  const order = await getAdminOrder(orderId, { service: true });
  if (!order) throw new Error("order_not_found");
  const content = buildMerchantNewOrderEmail(order, siteUrl);
  const dedupeKey = `order:${order.id}:merchant_new_order`;
  const provider = process.env.TRANSACTIONAL_EMAIL_PROVIDER ?? "resend";
  const supabase = createSupabaseAdminClient();
  const { data: email, error } = await supabase.from("email_messages").insert({
    order_id: order.id,
    template_key: "merchant_new_order",
    recipient: company.email,
    locale: "cs",
    subject: content.subject,
    body_text: content.text,
    body_html: content.html,
    provider,
    dedupe_key: dedupeKey,
    status: "queued",
    trigger_source: "checkout",
    payload: { orderNumber: order.orderNumber, merchantNotification: true }
  }).select("id").single();
  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase.from("email_messages").select("id,status").eq("dedupe_key", dedupeKey).maybeSingle();
      return { status: "duplicate" as const, messageId: existing?.id ?? null, existingStatus: existing?.status ?? null };
    }
    throw new Error(error.message);
  }
  return deliverRecordedEmail(email.id, {
    to: company.email,
    toName: "AMARÉE",
    replyTo: order.email,
    subject: content.subject,
    text: content.text,
    html: content.html,
    idempotencyKey: dedupeKey,
    metadata: { order_id: order.id, order_number: order.orderNumber, template: "merchant_new_order" }
  });
}
