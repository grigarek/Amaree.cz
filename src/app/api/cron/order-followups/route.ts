import { NextResponse } from "next/server";
import { sendPendingPaymentReminders } from "@/lib/email/payment-reminders";
import { sendPendingLoyaltyRewardEmails } from "@/lib/email/loyalty-reward";

export const dynamic = "force-dynamic";

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const [paymentReminders, loyaltyNotifications] = await Promise.all([
      sendPendingPaymentReminders(),
      sendPendingLoyaltyRewardEmails()
    ]);
    return NextResponse.json({ paymentReminders, loyaltyNotifications });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "order_followups_failed" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
