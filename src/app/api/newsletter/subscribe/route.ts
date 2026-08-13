import { NextResponse } from "next/server";
import { subscribeToEcomail } from "@/lib/email/ecomail-newsletter";
import { isPlausibleHumanSubmission, newsletterSignupSchema } from "@/lib/forms/public-forms";

export async function POST(request: Request) {
  const parsed = newsletterSignupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isPlausibleHumanSubmission(parsed.data.startedAt)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  try {
    await subscribeToEcomail({ email: parsed.data.email, locale: parsed.data.locale });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("newsletter_subscription_failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}
