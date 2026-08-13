import { NextResponse } from "next/server";
import { checkoutSchema, type CheckoutInput } from "@/lib/checkout/validation";
import { validatePacketaPickupPoint } from "@/lib/shipping/packeta";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import { sendOrderStatusEmail } from "@/lib/email/order-status";
import { localizedPaths } from "@/i18n/routing";
import { getPacketaCodCapabilities } from "@/lib/admin/integration-settings";
import { isPacketaCodSupported } from "@/lib/shipping/capabilities";
import { buildCurrentOrderTermsSnapshot, ORDER_TERMS_VERSION } from "@/lib/email/order-terms";
import { validateDiscountCode } from "@/lib/discounts/validate";
import { isGoPayCheckoutAvailable, readGoPayTestCookie } from "@/lib/payments/gopay-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendMerchantNewOrderEmail } from "@/lib/email/merchant-order";
import { createAutomaticPacketaShipment } from "@/lib/shipping/packeta-create";

type CheckoutOrderResult = {
  orderId: string;
  orderNumber: string;
  paymentId: string;
  status: string;
  currency: "CZK" | "EUR";
  subtotal: number;
  discount: number;
  shipping: number;
  paymentFee: number;
  total: number;
  duplicate: boolean;
};

function splitCustomerName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) ?? "-" };
}

function checkoutPayload(input: CheckoutInput, canonicalPoint?: NonNullable<CheckoutInput["packetaPoint"]>, customerUserId?: string) {
  const customer = splitCustomerName(input.name);
  const shippingAddress = input.shippingMethodId === "packeta_pickup" && canonicalPoint
    ? { street: canonicalPoint.street, city: canonicalPoint.city, postalCode: canonicalPoint.zip, countryCode: input.countryCode }
    : { ...input.shippingAddress, countryCode: input.countryCode };
  return {
    locale: input.locale,
    email: input.email,
    phone: input.phone,
    ...customer,
    countryCode: input.countryCode,
    billingAddress: { ...input.billingAddress, countryCode: input.countryCode },
    shippingAddress,
    shippingMethodId: input.shippingMethodId,
    paymentMethodId: input.paymentMethodId,
    packetaPoint: canonicalPoint,
    discountCode: input.discountCode,
    giftCardDesignId: input.giftCardDesignId,
    customerNote: input.customerNote,
    customerUserId,
    lines: input.lines.map(({ productId, quantity }) => ({ productId, quantity }))
  };
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = checkoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_checkout_payload", issues: parsed.error.flatten() }, { status: 422 });
  }
  const customerSupabase = await createSupabaseServerClient();
  const { data: { user: signedInUser } } = await customerSupabase.auth.getUser();
  const customerUserId = signedInUser?.email?.toLowerCase() === parsed.data.email.toLowerCase() ? signedInUser.id : undefined;
  const goPayTestCookie = readGoPayTestCookie(request.headers.get("cookie"));
  if (parsed.data.paymentMethodId === "gopay" && !isGoPayCheckoutAvailable(goPayTestCookie)) {
    return NextResponse.json({ error: "gopay_checkout_disabled" }, { status: 503 });
  }

  let canonicalPoint: CheckoutInput["packetaPoint"];
  if (parsed.data.shippingMethodId === "packeta_pickup") {
    const packeta = await validatePacketaPickupPoint(parsed.data.packetaPoint, parsed.data.locale);
    if (!packeta.valid || !packeta.point) {
      return NextResponse.json({ error: "invalid_packeta_pickup_point" }, { status: 422 });
    }
    canonicalPoint = packeta.point;
  }

  if (parsed.data.paymentMethodId === "cash_on_delivery") {
    const capabilities = await getPacketaCodCapabilities();
    if (!isPacketaCodSupported(capabilities, parsed.data.countryCode, parsed.data.shippingMethodId, canonicalPoint?.type)) {
      return NextResponse.json({ error: "cash_on_delivery_not_verified_for_service" }, { status: 422 });
    }
  }

  if (parsed.data.discountCode) {
    try {
      const discount = await validateDiscountCode(parsed.data.discountCode, parsed.data.countryCode === "CZ" ? "CZK" : "EUR", parsed.data.lines, parsed.data.locale, customerUserId);
      if (!discount.valid) return NextResponse.json({ error: "discount_code_invalid", message: discount.message }, { status: 422 });
    } catch {
      return NextResponse.json({ error: "discount_validation_unavailable" }, { status: 503 });
    }
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("create_checkout_order", {
      p_idempotency_key: parsed.data.idempotencyKey,
      p_payload: checkoutPayload(parsed.data, canonicalPoint, customerUserId)
    });
    if (error) {
      const status = error.message.includes("insufficient_stock") ? 409 : 422;
      return NextResponse.json({ error: error.message }, { status });
    }
    const order = data as CheckoutOrderResult;
    const { data: persistedOrder, error: persistedOrderError } = await supabase
      .from("orders")
      .select("order_number")
      .eq("id", order.orderId)
      .single();
    if (persistedOrderError || !persistedOrder?.order_number) throw new Error("order_number_lookup_failed");
    order.orderNumber = persistedOrder.order_number;
    if (customerUserId) {
      const { error: customerLinkError } = await supabase.from("orders").update({ customer_user_id: customerUserId }).eq("id", order.orderId).is("customer_user_id", null);
      if (customerLinkError) throw new Error(`order_customer_link_failed:${customerLinkError.message}`);
    }
    const termsSnapshot = buildCurrentOrderTermsSnapshot(parsed.data.locale === "sk" ? "sk" : "cs");
    const { error: termsError } = await supabase.from("orders").update({
      terms_accepted_at: termsSnapshot.capturedAt,
      terms_version: ORDER_TERMS_VERSION,
      terms_snapshot: termsSnapshot
    }).eq("id", order.orderId).is("terms_accepted_at", null);
    if (termsError) throw new Error(`order_terms_snapshot_failed:${termsError.message}`);
    const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.url).origin;
    try {
      await sendMerchantNewOrderEmail(order.orderId, siteUrl);
    } catch {
      // A failed internal notification is recorded but must not invalidate the customer's order.
    }

    if (parsed.data.paymentMethodId === "gopay") {
      const { data: payment } = await supabase.from("payments").select("provider_payment_id,provider_payload").eq("id", order.paymentId).single();
      const previousRedirect = (payment?.provider_payload as { gw_url?: string } | null)?.gw_url;
      if (payment?.provider_payment_id && previousRedirect) {
        return NextResponse.json({ ...order, redirectUrl: previousRedirect });
      }
      const { data: claimed, error: claimError } = await supabase.rpc("claim_gopay_payment_creation", { p_payment_id: order.paymentId });
      if (claimError) throw new Error("gopay_payment_claim_failed");
      if (!claimed) return NextResponse.json({ error: "gopay_payment_creation_in_progress" }, { status: 409 });
      let session;
      try {
        session = await getPaymentProvider("gopay").createCheckoutSession({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          customerEmail: parsed.data.email,
          currency: order.currency,
          total: order.total,
          successUrl: `${siteUrl}/api/payments/gopay/return?locale=${encodeURIComponent(parsed.data.locale)}`,
          cancelUrl: `${siteUrl}${localizedPaths[parsed.data.locale].checkout}`,
          notificationUrl: `${siteUrl}/api/payments/gopay/notification`,
          locale: parsed.data.locale
        });
      } catch (error) {
        await supabase.from("payments").update({ provider_payload: {} }).eq("id", order.paymentId).is("provider_payment_id", null);
        throw error;
      }
      const { error: paymentUpdateError } = await supabase.from("payments").update({
        provider_payment_id: session.providerReference,
        provider_payload: { gw_url: session.redirectUrl }
      }).eq("id", order.paymentId).is("provider_payment_id", null);
      if (paymentUpdateError) throw new Error("gopay_payment_link_persistence_failed");
      return NextResponse.json({ ...order, redirectUrl: session.redirectUrl }, { status: order.duplicate ? 200 : 201 });
    }

    const template = parsed.data.paymentMethodId === "bank_transfer" ? "awaiting_bank_transfer" : "order_received";
    try {
      await sendOrderStatusEmail(order.orderId, template, { triggerSource: "checkout" });
    } catch {
      // The order is valid even when the transactional provider is temporarily unavailable.
    }
    let shipmentStatus: string | null = null;
    if (parsed.data.paymentMethodId === "cash_on_delivery") {
      try {
        shipmentStatus = (await createAutomaticPacketaShipment(order.orderId)).status;
      } catch {
        shipmentStatus = "failed_recorded";
      }
    }
    const thankYouUrl = `${siteUrl}${localizedPaths[parsed.data.locale].thankYou}?order=${encodeURIComponent(order.orderNumber)}`;
    return NextResponse.json({ ...order, thankYouUrl, shipmentStatus }, { status: order.duplicate ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "checkout_failed" }, { status: 500 });
  }
}
