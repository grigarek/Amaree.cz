import { NextRequest, NextResponse } from "next/server";
import { GOPAY_TEST_COOKIE, isValidGoPayTestToken } from "@/lib/payments/gopay-access";

export function GET(request: NextRequest) {
  if (process.env.GOPAY_ENVIRONMENT !== "sandbox" || process.env.GOPAY_CHECKOUT_ENABLED !== "true") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!isValidGoPayTestToken(token)) {
    return NextResponse.json({ error: "invalid_test_access" }, { status: 403 });
  }

  const requestedNext = request.nextUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/cs/objednavka";
  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(GOPAY_TEST_COOKIE, token!, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 2 * 60 * 60,
    path: "/"
  });
  return response;
}
