import { NextResponse } from "next/server";
import { calculateOrderTotal, validateStock } from "@/lib/cart";
import { checkoutSchema } from "@/lib/checkout/validation";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = checkoutSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const stock = validateStock(parsed.data.lines);
  if (!stock.ok) {
    return NextResponse.json({ error: "Insufficient stock", productId: stock.productId, available: stock.available }, { status: 409 });
  }

  const totals = calculateOrderTotal(parsed.data.lines, parsed.data.discountCode, parsed.data.shippingMethodId);

  // TODO: Create pending order in Supabase, then call getPaymentProvider("stripe").createCheckoutSession().
  return NextResponse.json({
    status: "pending_provider_configuration",
    order: {
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      total: totals.total,
      currency: totals.currency
    }
  });
}
