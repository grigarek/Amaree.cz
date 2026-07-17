import "server-only";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEcomailTransactional } from "@/lib/email/ecomail";

export type ComplaintTemplateKey = "complaint_received" | "complaint_resolved";

export function buildComplaintStatusEmail(input: {
  complaintNumber: string;
  template: ComplaintTemplateKey;
  result?: string | null;
}) {
  const received = input.template === "complaint_received";
  const subject = received ? `Reklamaci ${input.complaintNumber} jsme přijali` : `Reklamace ${input.complaintNumber} byla vyřízena`;
  const text = received
    ? `Děkujeme. Reklamaci ${input.complaintNumber} jsme přijali a budeme vás informovat o jejím průběhu.\n\nAMARÉE\ninfo@amaree.cz`
    : `Reklamace ${input.complaintNumber} byla vyřízena.${input.result ? `\n\nVýsledek: ${input.result}` : ""}\n\nAMARÉE\ninfo@amaree.cz`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#171313"><h1 style="font-family:Georgia,serif;color:#bc2227">${subject}</h1>${text.split("\n").map((line) => line ? `<p>${line.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>` : "<br>").join("")}</div>`;
  return { subject, text, html };
}

export async function sendComplaintStatusEmail(complaintId: string, template: ComplaintTemplateKey, manualResend = false) {
  const supabase = createSupabaseAdminClient();
  const { data: complaint, error } = await supabase.from("complaints").select("id,complaint_number,customer_email,result").eq("id", complaintId).single();
  if (error || !complaint) throw new Error("complaint_not_found");
  const content = buildComplaintStatusEmail({ complaintNumber: complaint.complaint_number, template, result: complaint.result });
  const dedupeKey = manualResend ? `complaint:${complaintId}:${template}:manual:${randomUUID()}` : `complaint:${complaintId}:${template}`;
  const { data: message, error: insertError } = await supabase.from("email_messages").insert({
    complaint_id: complaintId,
    template_key: template,
    recipient: complaint.customer_email,
    locale: "cs",
    subject: content.subject,
    dedupe_key: dedupeKey,
    status: "queued",
    payload: { complaintNumber: complaint.complaint_number, manualResend }
  }).select("id").single();
  if (insertError?.code === "23505") return { status: "duplicate" as const };
  if (insertError || !message) throw new Error(insertError?.message ?? "complaint_email_record_failed");
  try {
    const sent = await sendEcomailTransactional({ to: complaint.customer_email, subject: content.subject, text: content.text, html: content.html, metadata: { complaint_id: complaintId, template } });
    await supabase.from("email_messages").update({ status: sent.mode === "sent" ? "sent" : "queued", provider_message_id: sent.providerMessageId, sent_at: sent.mode === "sent" ? new Date().toISOString() : null }).eq("id", message.id);
    return { status: sent.mode };
  } catch (sendError) {
    await supabase.from("email_messages").update({ status: "failed", error_message: sendError instanceof Error ? sendError.message : "send_failed" }).eq("id", message.id);
    throw sendError;
  }
}
