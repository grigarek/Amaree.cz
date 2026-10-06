import type { PaymentStatus } from "./provider";

type PaymentLifecycleEvent =
  | "payment_created"
  | "payment_status_checked"
  | "notification_accepted"
  | "notification_duplicate"
  | "notification_verification_failed";

type PaymentLogContext = {
  provider: "gopay";
  providerReference?: string;
  orderNumber?: string;
  status?: PaymentStatus;
};

export function logPaymentLifecycle(event: PaymentLifecycleEvent, context: PaymentLogContext) {
  console.info("[payment]", JSON.stringify({ event, ...context }));
}
