import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendOrderStatusEmail } from "@/lib/email/order-status";

export const PAYMENT_REMINDER_DELAY_MINUTES = 30;

const terminalOrderStatuses = new Set(["cancelled", "refunded", "archived"]);

export function isPendingPaymentReminderDue(input: {
  paymentStatus: string;
  paymentCreatedAt: string;
  orderStatus?: string | null;
  now?: Date;
}) {
  if (input.paymentStatus !== "pending" || terminalOrderStatuses.has(input.orderStatus ?? "")) return false;
  const createdAt = new Date(input.paymentCreatedAt).getTime();
  if (!Number.isFinite(createdAt)) return false;
  const now = (input.now ?? new Date()).getTime();
  return now - createdAt >= PAYMENT_REMINDER_DELAY_MINUTES * 60_000;
}

export async function sendPendingPaymentReminders(limit = 100) {
  const supabase = createSupabaseAdminClient();
  const threshold = new Date(Date.now() - PAYMENT_REMINDER_DELAY_MINUTES * 60_000).toISOString();
  const { data: payments, error } = await supabase
    .from("payments")
    .select("id,order_id,status,created_at")
    .eq("provider", "gopay")
    .eq("status", "pending")
    .lte("created_at", threshold)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`pending_payment_reminders_failed:${error.message}`);

  const result = { checked: payments?.length ?? 0, sent: 0, duplicate: 0, skipped: 0, failed: 0 };
  for (const payment of payments ?? []) {
    try {
      const [{ data: currentPayment }, { data: order }] = await Promise.all([
        supabase.from("payments").select("status,created_at").eq("id", payment.id).maybeSingle(),
        supabase.from("orders").select("status").eq("id", payment.order_id).maybeSingle()
      ]);
      if (!currentPayment || !order || !isPendingPaymentReminderDue({
        paymentStatus: currentPayment.status,
        paymentCreatedAt: currentPayment.created_at,
        orderStatus: order.status
      })) {
        result.skipped += 1;
        continue;
      }
      const email = await sendOrderStatusEmail(payment.order_id, "awaiting_online_payment", { triggerSource: "system" });
      if (email.status === "duplicate") result.duplicate += 1;
      else result.sent += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}
