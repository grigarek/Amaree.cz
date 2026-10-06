import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTransactionalEmailSettings } from "@/lib/admin/integration-settings";
import { getTransactionalEmailProvider } from "@/lib/email";
import type { TransactionalEmailInput } from "@/lib/email/provider";
import { buildCurrentOrderTermsSnapshot, buildOrderTermsAttachment, isOrderTermsSnapshot, shouldAttachOrderTerms } from "@/lib/email/order-terms";

function startOfUtcDay(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function startOfUtcMonth(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function getTransactionalEmailUsage(provider = "resend", now = new Date()) {
  const supabase = createSupabaseAdminClient();
  const [daily, monthly, queued, settings] = await Promise.all([
    supabase.from("email_messages").select("id", { count: "exact", head: true }).eq("provider", provider).eq("status", "sent").gte("sent_at", startOfUtcDay(now)),
    supabase.from("email_messages").select("id", { count: "exact", head: true }).eq("provider", provider).eq("status", "sent").gte("sent_at", startOfUtcMonth(now)),
    supabase.from("email_messages").select("id", { count: "exact", head: true }).eq("provider", provider).eq("status", "queued"),
    getTransactionalEmailSettings()
  ]);
  return {
    provider,
    daily: daily.count ?? 0,
    monthly: monthly.count ?? 0,
    queued: queued.count ?? 0,
    dailyLimit: settings.dailyWarningLimit,
    monthlyLimit: settings.monthlyWarningLimit
  };
}

export async function deliverRecordedEmail(messageId: string, input: TransactionalEmailInput) {
  const supabase = createSupabaseAdminClient();
  const provider = getTransactionalEmailProvider();
  const usage = await getTransactionalEmailUsage(provider.name);
  const limitReason = usage.daily >= usage.dailyLimit
    ? "internal_daily_email_limit_reached"
    : usage.monthly >= usage.monthlyLimit
      ? "internal_monthly_email_limit_reached"
      : null;

  if (limitReason) {
    await supabase.from("email_messages").update({
      status: "queued",
      provider: provider.name,
      error_message: limitReason,
      provider_response: { usage }
    }).eq("id", messageId);
    return { status: "queued" as const, messageId, reason: limitReason };
  }

  const { data: message } = await supabase.from("email_messages").select("attempt_count").eq("id", messageId).maybeSingle();
  await supabase.from("email_messages").update({
    provider: provider.name,
    attempt_count: Number(message?.attempt_count ?? 0) + 1,
    last_attempt_at: new Date().toISOString(),
    error_message: null
  }).eq("id", messageId);

  try {
    const result = await provider.sendTransactionalEmail(input);
    await supabase.from("email_messages").update({
      status: result.mode === "sent" ? "sent" : "suppressed",
      provider: result.provider,
      provider_message_id: result.providerMessageId,
      sent_at: result.mode === "sent" ? new Date().toISOString() : null,
      provider_response: { mode: result.mode, actualRecipient: result.actualRecipient }
    }).eq("id", messageId);
    return { status: result.mode, messageId, providerMessageId: result.providerMessageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "transactional_email_send_failed";
    await supabase.from("email_messages").update({ status: "failed", error_message: message }).eq("id", messageId);
    throw error;
  }
}

export async function retryRecordedEmail(orderId: string, messageId: string, triggeredBy: string) {
  const supabase = createSupabaseAdminClient();
  const { data: message, error } = await supabase.from("email_messages").select(`
    id,order_id,recipient,subject,body_text,body_html,dedupe_key,status,template_key
  `).eq("id", messageId).eq("order_id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!message) throw new Error("email_message_not_found");
  if (!["failed", "queued"].includes(message.status)) throw new Error("email_message_not_retryable");

  await supabase.from("email_messages").update({
    triggered_by: triggeredBy,
    trigger_source: "admin_manual",
    error_message: null
  }).eq("id", message.id);

  let attachments: TransactionalEmailInput["attachments"];
  if (shouldAttachOrderTerms(message.template_key)) {
    const { data: order, error: orderError } = await supabase.from("orders").select("terms_snapshot,shipping_country").eq("id", orderId).maybeSingle();
    if (orderError) throw new Error(orderError.message);
    const snapshot = isOrderTermsSnapshot(order?.terms_snapshot) ? order.terms_snapshot : buildCurrentOrderTermsSnapshot(order?.shipping_country === "SK" ? "sk" : "cs");
    attachments = [buildOrderTermsAttachment(snapshot)];
  }

  return deliverRecordedEmail(message.id, {
    to: message.recipient,
    subject: message.subject,
    text: message.body_text,
    html: message.body_html,
    attachments,
    idempotencyKey: message.dedupe_key,
    metadata: { order_id: orderId, email_message_id: message.id }
  });
}
