import { commerceConfig, getCheckoutCurrency, getPaymentQuote, getShippingMethods, getShippingQuote, isPaymentAllowed, type DeliveryCountryCode } from "@/lib/commerce/config";
import { products } from "@/lib/products";
import type { CartLine, DiscountCode, PaymentMethodId, PricedCartLine, ShippingMethodId } from "@/types/domain";
import { clampQuantity } from "./money";

export const demoDiscounts: DiscountCode[] = [
  {
    code: "AMAREE10",
    type: "percent",
    value: 10,
    minimumOrderValue: 100000,
    active: true,
    usageLimit: 100,
    usageCount: 0
  }
];

export function priceCartLines(lines: CartLine[]): PricedCartLine[] {
  return lines.flatMap((line) => {
    const product = line.product?.id === line.productId && line.product.active
      ? line.product
      : products.find((item) => item.id === line.productId && item.active);
    if (!product) return [];
    const quantity = clampQuantity(line.quantity, product.stockQuantity);
    if (quantity < 1 || product.stockQuantity < 1) return [];

    return [{ product, quantity, unitPrice: product.price, lineTotal: product.price * quantity }];
  });
}

export function calculateSubtotal(lines: PricedCartLine[]): number {
  return lines.reduce((total, line) => total + line.lineTotal, 0);
}

export function calculateDiscount(subtotal: number, code?: string): number {
  if (!code) return 0;
  const discount = demoDiscounts.find((item) => item.code.toLowerCase() === code.toLowerCase());
  if (!discount || !discount.active || subtotal < discount.minimumOrderValue) return 0;
  if (discount.usageLimit && discount.usageCount >= discount.usageLimit) return 0;
  if (discount.type === "percent") return Math.floor((subtotal * discount.value) / 100);
  return Math.min(discount.value, subtotal);
}

export function calculateShipping(
  subtotalAfterDiscount: number,
  shippingMethodId: ShippingMethodId = "packeta_pickup",
  countryCode: DeliveryCountryCode = "CZ"
): number {
  if (!getShippingMethods(countryCode).includes(shippingMethodId)) throw new Error("shipping_method_not_available");
  const quote = getShippingQuote(shippingMethodId, countryCode);
  const free = countryCode === commerceConfig.freeShipping.country
    && shippingMethodId !== "personal_pickup"
    && subtotalAfterDiscount >= commerceConfig.freeShipping.threshold;
  return free ? 0 : quote.amount;
}

export function calculatePaymentFee(paymentMethodId: PaymentMethodId, shippingMethodId: ShippingMethodId, countryCode: DeliveryCountryCode = "CZ"): number {
  if (!isPaymentAllowed(shippingMethodId, paymentMethodId)) throw new Error("payment_method_not_available");
  return getPaymentQuote(paymentMethodId, countryCode).amount;
}

export function calculateCheckoutCharges(input: {
  subtotalAfterDiscount: number;
  countryCode: DeliveryCountryCode;
  shippingMethodId: ShippingMethodId;
  paymentMethodId: PaymentMethodId;
}) {
  return {
    shipping: calculateShipping(input.subtotalAfterDiscount, input.shippingMethodId, input.countryCode),
    paymentFee: calculatePaymentFee(input.paymentMethodId, input.shippingMethodId, input.countryCode),
    currency: getCheckoutCurrency(input.countryCode)
  };
}

export function calculateOrderTotal(
  lines: CartLine[],
  discountCode?: string,
  options: {
    countryCode: DeliveryCountryCode;
    shippingMethodId: ShippingMethodId;
    paymentMethodId: PaymentMethodId;
  } = { countryCode: "CZ", shippingMethodId: "packeta_pickup", paymentMethodId: "gopay" }
) {
  const pricedLines = priceCartLines(lines);
  const currency = getCheckoutCurrency(options.countryCode);
  if (pricedLines.some((line) => line.product.currency !== currency)) throw new Error("product_currency_not_available");
  const subtotal = calculateSubtotal(pricedLines);
  const discount = calculateDiscount(subtotal, discountCode);
  const charges = pricedLines.length
    ? calculateCheckoutCharges({ subtotalAfterDiscount: subtotal - discount, ...options })
    : { shipping: 0, paymentFee: 0, currency };

  return {
    lines: pricedLines,
    subtotal,
    discount,
    shipping: charges.shipping,
    paymentFee: charges.paymentFee,
    total: Math.max(subtotal - discount + charges.shipping + charges.paymentFee, 0),
    currency
  };
}

export function validateStock(lines: CartLine[]): { ok: true } | { ok: false; productId: string; available: number } {
  for (const line of lines) {
    const product = line.product?.id === line.productId && line.product.active
      ? line.product
      : products.find((item) => item.id === line.productId && item.active);
    if (!product || line.quantity > product.stockQuantity) {
      return { ok: false, productId: line.productId, available: product?.stockQuantity ?? 0 };
    }
  }
  return { ok: true };
}
