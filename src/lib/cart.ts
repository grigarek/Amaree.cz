import { commerceConfig, getCheckoutCurrency, getPaymentQuote, getShippingMethods, getShippingQuote, isPaymentAllowed, type DeliveryCountryCode } from "@/lib/commerce/config";
import { products } from "@/lib/products";
import type { CartLine, PaymentMethodId, PricedCartLine, ShippingMethodId } from "@/types/domain";
import { clampQuantity } from "./money";
import { getGiftCardDesign, getGiftCardPrice, type GiftCardDesignId } from "@/lib/gift-cards";

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

export function calculateDiscount(subtotal: number, verifiedAmount = 0): number {
  return Math.min(Math.max(Math.floor(verifiedAmount), 0), subtotal);
}

export function calculateShipping(
  subtotalAfterDiscount: number,
  shippingMethodId: ShippingMethodId = "packeta_pickup",
  countryCode: DeliveryCountryCode = "CZ"
): number {
  if (!getShippingMethods(countryCode).includes(shippingMethodId)) throw new Error("shipping_method_not_available");
  const quote = getShippingQuote(shippingMethodId, countryCode);
  const free = countryCode === commerceConfig.freeShipping.country
    && subtotalAfterDiscount >= commerceConfig.freeShipping.threshold;
  return free ? 0 : quote.amount;
}

export function calculatePaymentFee(paymentMethodId: PaymentMethodId, shippingMethodId: ShippingMethodId, countryCode: DeliveryCountryCode = "CZ"): number {
  if (!isPaymentAllowed(shippingMethodId, paymentMethodId, countryCode)) throw new Error("payment_method_not_available");
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
    discountAmount?: number;
    freeShipping?: boolean;
    giftCardDesignId?: GiftCardDesignId | null;
  } = { countryCode: "CZ", shippingMethodId: "packeta_pickup", paymentMethodId: "gopay" }
) {
  const pricedLines = priceCartLines(lines);
  const currency = getCheckoutCurrency(options.countryCode);
  if (pricedLines.some((line) => line.product.currency !== currency)) throw new Error("product_currency_not_available");
  const productSubtotal = calculateSubtotal(pricedLines);
  const giftCard = getGiftCardDesign(options.giftCardDesignId);
  const giftCardPrice = giftCard ? getGiftCardPrice(currency) : 0;
  const subtotal = productSubtotal + giftCardPrice;
  void discountCode;
  const discount = calculateDiscount(productSubtotal, options.discountAmount);
  const charges = pricedLines.length
    ? calculateCheckoutCharges({ subtotalAfterDiscount: productSubtotal - discount, ...options })
    : { shipping: 0, paymentFee: 0, currency };

  return {
    lines: pricedLines,
    productSubtotal,
    giftCard,
    giftCardPrice,
    subtotal,
    discount,
    shipping: options.freeShipping ? 0 : charges.shipping,
    paymentFee: charges.paymentFee,
    total: Math.max(subtotal - discount + (options.freeShipping ? 0 : charges.shipping) + charges.paymentFee, 0),
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
