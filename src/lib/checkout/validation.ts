import { z } from "zod";

export const checkoutLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive()
});

export const checkoutSchema = z.object({
  locale: z.enum(["cs", "en", "de"]),
  email: z.string().email(),
  phone: z.string().min(7),
  name: z.string().min(2),
  shippingMethodId: z.enum(["zasilkovna", "ppl", "pickup"]),
  discountCode: z.string().optional(),
  lines: z.array(checkoutLineSchema).min(1)
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
