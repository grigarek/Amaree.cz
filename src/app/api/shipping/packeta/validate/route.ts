import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/routing";
import { validatePacketaPickupPoint } from "@/lib/shipping/packeta";

export async function POST(request: Request) {
  const body = (await request.json()) as { locale?: string; point?: unknown };
  if (!body.locale || !isLocale(body.locale)) {
    return NextResponse.json({ valid: false, errors: ["invalid_locale"] }, { status: 400 });
  }

  const result = await validatePacketaPickupPoint(body.point, body.locale);
  return NextResponse.json(result, { status: result.valid ? 200 : 422 });
}
