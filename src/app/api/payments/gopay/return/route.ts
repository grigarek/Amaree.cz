import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/routing";
import { getPaymentProvider } from "@/lib/payments";
import { localizedPaths } from "@/i18n/routing";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("id");
  const localeParam = url.searchParams.get("locale") ?? "cs";
  const locale = isLocale(localeParam) ? localeParam : "cs";

  if (!paymentId || !/^\d+$/.test(paymentId)) {
    return NextResponse.redirect(new URL(`${localizedPaths[locale].checkout}?paymentStatus=invalid`, url.origin));
  }

  try {
    const payment = await getPaymentProvider("gopay").getPaymentStatus(paymentId);
    const target = new URL(localizedPaths[locale].thankYou, url.origin);
    target.searchParams.set("paymentStatus", payment.status);
    target.searchParams.set("paymentId", payment.providerReference);
    return NextResponse.redirect(target);
  } catch {
    return NextResponse.redirect(new URL(`${localizedPaths[locale].checkout}?paymentStatus=unavailable`, url.origin));
  }
}
