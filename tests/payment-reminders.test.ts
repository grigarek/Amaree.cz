import { describe, expect, it } from "vitest";
import { isPendingPaymentReminderDue, PAYMENT_REMINDER_DELAY_MINUTES } from "@/lib/email/payment-reminders";

const now = new Date("2026-08-09T12:00:00.000Z");

describe("pending online payment reminders", () => {
  it("waits until an online payment has remained pending for the configured delay", () => {
    expect(isPendingPaymentReminderDue({
      paymentStatus: "pending",
      paymentCreatedAt: new Date(now.getTime() - (PAYMENT_REMINDER_DELAY_MINUTES - 1) * 60_000).toISOString(),
      orderStatus: "awaiting_payment",
      now
    })).toBe(false);
    expect(isPendingPaymentReminderDue({
      paymentStatus: "pending",
      paymentCreatedAt: new Date(now.getTime() - PAYMENT_REMINDER_DELAY_MINUTES * 60_000).toISOString(),
      orderStatus: "awaiting_payment",
      now
    })).toBe(true);
  });

  it("never reminds completed payments or terminal orders", () => {
    const paymentCreatedAt = new Date(now.getTime() - 2 * 60 * 60_000).toISOString();
    expect(isPendingPaymentReminderDue({ paymentStatus: "paid", paymentCreatedAt, orderStatus: "paid", now })).toBe(false);
    expect(isPendingPaymentReminderDue({ paymentStatus: "pending", paymentCreatedAt, orderStatus: "cancelled", now })).toBe(false);
  });
});
