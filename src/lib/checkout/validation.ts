import { z } from "zod";
import { DELIVERY_COUNTRY_CODES, getShippingMethods, isPaymentAllowed } from "@/lib/commerce/config";
import { packetaPickupPointSchema } from "@/lib/shipping/packeta";
import { giftCardDesigns } from "@/lib/gift-cards";

export const checkoutLineSchema = z.object({ productId: z.string().min(1), quantity: z.number().int().positive() });

const addressSchema = z.object({
  street: z.string().trim().min(3).refine((value) => /\d/.test(value), "Street address must include a house number."),
  city: z.string().trim().min(2),
  postalCode: z.string().trim().regex(/^\d{3}\s?\d{2}$/, "Invalid postal code.")
});

const customerNameSchema = z.string().trim().min(3).refine(
  (value) => value.split(/\s+/).filter(Boolean).length >= 2,
  "First and last name are required."
);

const phoneSchema = z.string().trim().refine((value) => {
  const normalized = value.replace(/[\s()-]/g, "");
  return /^(?:\+420|00420)?\d{9}$/.test(normalized) || /^(?:\+421|00421)?\d{9}$/.test(normalized);
}, "Invalid Czech or Slovak phone number.");

export const checkoutSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    locale: z.enum(["cs", "sk", "en", "de"]),
    email: z.string().trim().email(),
    phone: phoneSchema,
    name: customerNameSchema,
    countryCode: z.enum(DELIVERY_COUNTRY_CODES),
    shippingMethodId: z.enum(["packeta_home", "packeta_pickup", "eu_delivery"]),
    paymentMethodId: z.enum(["gopay", "cash_on_delivery", "bank_transfer"]),
    billingAddress: addressSchema,
    shippingAddress: addressSchema.optional(),
    packetaPoint: packetaPickupPointSchema.optional(),
    discountCode: z.string().trim().max(64).optional(),
    customerNote: z.string().trim().max(1000).optional(),
    termsAccepted: z.literal(true),
    giftCardDesignId: z.enum(giftCardDesigns.map((design) => design.id) as [string, ...string[]]).optional(),
    lines: z.array(checkoutLineSchema).min(1)
  })
  .superRefine((checkout, ctx) => {
    if (!getShippingMethods(checkout.countryCode).includes(checkout.shippingMethodId)) {
      ctx.addIssue({ code: "custom", path: ["shippingMethodId"], message: "Shipping method is not available for this country." });
    }
    if (!isPaymentAllowed(checkout.shippingMethodId, checkout.paymentMethodId, checkout.countryCode)) {
      ctx.addIssue({ code: "custom", path: ["paymentMethodId"], message: "Payment method is not available for this shipping method." });
    }
    const expectedCountry = checkout.locale === "sk" ? "SK" : "CZ";
    if (checkout.countryCode !== expectedCountry) {
      ctx.addIssue({ code: "custom", path: ["countryCode"], message: "Delivery country does not match the selected storefront." });
    }
    if (checkout.shippingMethodId === "packeta_pickup" && !checkout.packetaPoint) {
      ctx.addIssue({ code: "custom", path: ["packetaPoint"], message: "Packeta pickup point is required." });
    }
    if (["packeta_home", "eu_delivery"].includes(checkout.shippingMethodId) && !checkout.shippingAddress) {
      ctx.addIssue({ code: "custom", path: ["shippingAddress"], message: "Shipping address is required." });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
