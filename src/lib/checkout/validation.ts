import { z } from "zod";
import { DELIVERY_COUNTRY_CODES, getShippingMethods, isPaymentAllowed } from "@/lib/commerce/config";
import { packetaPickupPointSchema } from "@/lib/shipping/packeta";

export const checkoutLineSchema = z.object({ productId: z.string().min(1), quantity: z.number().int().positive() });

const addressSchema = z.object({
  street: z.string().min(3),
  city: z.string().min(2),
  postalCode: z.string().min(3)
});

export const checkoutSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    locale: z.enum(["cs", "en", "de"]),
    email: z.string().email(),
    phone: z.string().min(7),
    name: z.string().min(2),
    countryCode: z.enum(DELIVERY_COUNTRY_CODES),
    shippingMethodId: z.enum(["packeta_home", "packeta_pickup", "personal_pickup", "eu_delivery"]),
    paymentMethodId: z.enum(["gopay", "cash_on_delivery", "bank_transfer"]),
    billingAddress: addressSchema,
    shippingAddress: addressSchema.optional(),
    packetaPoint: packetaPickupPointSchema.optional(),
    discountCode: z.string().trim().max(64).optional(),
    customerNote: z.string().trim().max(1000).optional(),
    lines: z.array(checkoutLineSchema).min(1)
  })
  .superRefine((checkout, ctx) => {
    if (!getShippingMethods(checkout.countryCode).includes(checkout.shippingMethodId)) {
      ctx.addIssue({ code: "custom", path: ["shippingMethodId"], message: "Shipping method is not available for this country." });
    }
    if (!isPaymentAllowed(checkout.shippingMethodId, checkout.paymentMethodId)) {
      ctx.addIssue({ code: "custom", path: ["paymentMethodId"], message: "Payment method is not available for this shipping method." });
    }
    if (checkout.shippingMethodId === "packeta_pickup" && !checkout.packetaPoint) {
      ctx.addIssue({ code: "custom", path: ["packetaPoint"], message: "Packeta pickup point is required." });
    }
    if (["packeta_home", "eu_delivery"].includes(checkout.shippingMethodId) && !checkout.shippingAddress) {
      ctx.addIssue({ code: "custom", path: ["shippingAddress"], message: "Shipping address is required." });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
