import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";

const processedEvents = new Set<string>();

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const provider = getPaymentProvider("stripe");
  const result = await provider.verifyWebhook(payload, signature);

  if (processedEvents.has(result.eventId)) {
    return NextResponse.json({ status: "duplicate_ignored" });
  }

  processedEvents.add(result.eventId);

  // TODO: In production persist webhook event IDs in Supabase, mark order paid and decrement stock transactionally.
  return NextResponse.json(result);
}
