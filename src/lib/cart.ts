import { products } from "@/lib/products";
import type { CartLine, DiscountCode, PricedCartLine, ShippingMethod } from "@/types/domain";
import { clampQuantity } from "./money";

export const shippingMethods: ShippingMethod[] = [
  {
    id: "zasilkovna",
    name: { cs: "Zásilkovna", en: "Packeta pickup point", de: "Packeta Abholstelle" },
    price: 7900
  },
  {
    id: "ppl",
    name: { cs: "PPL", en: "PPL courier", de: "PPL Kurier" },
    price: 11900
  },
  {
    id: "pickup",
    name: { cs: "Osobní odběr", en: "Personal pickup", de: "Persönliche Abholung" },
    price: 0
  }
];

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
    const product = products.find((item) => item.id === line.productId && item.active);
    if (!product) return [];
    const quantity = clampQuantity(line.quantity, product.stockQuantity);
    if (quantity < 1 || product.stockQuantity < 1) return [];

    return [
      {
        product,
        quantity,
        unitPrice: product.price,
        lineTotal: product.price * quantity
      }
    ];
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

  if (discount.type === "percent") {
    return Math.floor((subtotal * discount.value) / 100);
  }

  return Math.min(discount.value, subtotal);
}

export function calculateShipping(subtotalAfterDiscount: number, shippingMethodId = "zasilkovna", freeThreshold = 250000): number {
  const method = shippingMethods.find((item) => item.id === shippingMethodId) ?? shippingMethods[0];
  if (subtotalAfterDiscount >= freeThreshold && method.id !== "pickup") return 0;
  return method.price;
}

export function calculateOrderTotal(lines: CartLine[], discountCode?: string, shippingMethodId = "zasilkovna") {
  const pricedLines = priceCartLines(lines);
  const subtotal = calculateSubtotal(pricedLines);
  const discount = calculateDiscount(subtotal, discountCode);
  const shipping = calculateShipping(subtotal - discount, shippingMethodId);

  return {
    lines: pricedLines,
    subtotal,
    discount,
    shipping,
    total: Math.max(subtotal - discount + shipping, 0),
    currency: "CZK" as const
  };
}

export function validateStock(lines: CartLine[]): { ok: true } | { ok: false; productId: string; available: number } {
  for (const line of lines) {
    const product = products.find((item) => item.id === line.productId && item.active);
    if (!product || line.quantity > product.stockQuantity) {
      return { ok: false, productId: line.productId, available: product?.stockQuantity ?? 0 };
    }
  }

  return { ok: true };
}
