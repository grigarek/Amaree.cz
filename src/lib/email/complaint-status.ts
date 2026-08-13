import "server-only";
import { randomUUID } from "node:crypto";
import { company } from "@/lib/config/company";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deliverRecordedEmail } from "@/lib/email/delivery";
import type { EmailLocale } from "@/lib/email/provider";

export type ComplaintTemplateKey = "complaint_received" | "complaint_resolved";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function buildComplaintStatusEmail(input: {
  complaintNumber: string;
  template: ComplaintTemplateKey;
  locale?: EmailLocale;
  customerName?: string | null;
  result?: string | null;
}) {
  const locale = input.locale ?? "cs";
  const received = input.template === "complaint_received";
  const subject = locale === "sk"
    ? received ? `Reklamáciu ${input.complaintNumber} sme prijali` : `Reklamácia ${input.complaintNumber} bola vybavená`
    : received ? `Reklamaci ${input.complaintNumber} jsme přijali` : `Reklamace ${input.complaintNumber} byla vyřízena`;
  const greeting = locale === "sk" ? `Dobrý deň${input.customerName ? `, ${input.customerName}` : ""},` : `Dobrý den${input.customerName ? `, ${input.customerName}` : ""},`;
  const body = locale === "sk"
    ? received
      ? `potvrdzujeme prijatie reklamácie ${input.complaintNumber}. O jej priebehu vás budeme informovať.`
      : `reklamácia ${input.complaintNumber} bola vybavená.${input.result ? `\n\nVýsledok: ${input.result}` : ""}`
    : received
      ? `potvrzujeme přijetí reklamace ${input.complaintNumber}. O jejím průběhu vás budeme informovat.`
      : `reklamace ${input.complaintNumber} byla vyřízena.${input.result ? `\n\nVýsledek: ${input.result}` : ""}`;
  const text = `${greeting}\n\n${body}\n\nAMARÉE\n${company.email}\n${company.phone}`;
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#f7f4f3;font-family:Arial,sans-serif;color:#171313"><table role="presentation" width="100%"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:640px;background:#fff;border:1px solid #eadfe0"><tr><td style="padding:28px;text-align:center;color:#bc2227;font-family:Georgia,serif;font-size:30px;letter-spacing:4px">AMARÉE</td></tr><tr><td style="padding:16px 32px 32px"><p>${escapeHtml(greeting)}</p><h1 style="font-family:Georgia,serif;font-weight:400;color:#bc2227">${escapeHtml(subject)}</h1><p style="line-height:1.7;white-space:pre-line">${escapeHtml(body)}</p></td></tr><tr><td style="padding:20px 32px;background:#f8eeee;font-size:13px">AMARÉE · ${escapeHtml(company.email)} · ${escapeHtml(company.phone)}</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html, locale };
}

export async function sendComplaintStatusEmail(complaintId: string, template: ComplaintTemplateKey, manualResend = false, triggeredBy?: string | null) {
  const supabase = createSupabaseAdminClient();
  const { data: complaint, error } = await supabase.from("complaints").select("id,complaint_number,customer_email,result,orders(shipping_country,customer_first_name)").eq("id", complaintId).single();
  if (error || !complaint) throw new Error("complaint_not_found");
  const relatedOrder = Array.isArray(complaint.orders) ? complaint.orders[0] : complaint.orders;
  const locale: EmailLocale = relatedOrder?.shipping_country === "SK" ? "sk" : "cs";
  const content = buildComplaintStatusEmail({ complaintNumber: complaint.complaint_number, template, locale, customerName: relatedOrder?.customer_first_name, result: complaint.result });
  const dedupeKey = manualResend ? `complaint:${complaintId}:${template}:manual:${randomUUID()}` : `complaint:${complaintId}:${template}`;
  const { data: message, error: insertError } = await supabase.from("email_messages").insert({
    complaint_id: complaintId,
    template_key: template,
    recipient: complaint.customer_email,
    locale,
    subject: content.subject,
    body_text: content.text,
    body_html: content.html,
    provider: process.env.TRANSACTIONAL_EMAIL_PROVIDER ?? "resend",
    dedupe_key: dedupeKey,
    status: "queued",
    triggered_by: triggeredBy ?? null,
    trigger_source: "complaint",
    payload: { complaintNumber: complaint.complaint_number, manualResend }
  }).select("id").single();
  if (insertError) {
    if (insertError.code === "23505") return { status: "duplicate" as const, messageId: null };
    throw new Error(insertError.message);
  }
  return deliverRecordedEmail(message.id, {
    to: complaint.customer_email,
    toName: relatedOrder?.customer_first_name,
    subject: content.subject,
    text: content.text,
    html: content.html,
    replyTo: company.email,
    idempotencyKey: dedupeKey,
    metadata: { complaint_id: complaintId, template }
  });
}
