import type { Locale } from "@/i18n/routing";

export type { Locale };

export type Currency = "CZK" | "EUR";
export type CategorySlug = "earrings" | "necklaces" | "bracelets";

export type LocalizedText = Record<Locale, string>;

export interface Category {
  id: string;
  slug: CategorySlug;
  localizedSlug: Record<Locale, string>;
  name: LocalizedText;
  description: LocalizedText;
  active: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: LocalizedText;
  sortOrder: number;
}

export interface Product {
  id: string;
  slug: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  longDescription: LocalizedText;
  category: CategorySlug;
  price: number;
  originalPrice?: number;
  currency: Currency;
  sku: string;
  stockQuantity: number;
  material: LocalizedText;
  color?: LocalizedText;
  dimensions: LocalizedText;
  weightGrams?: number;
  care: LocalizedText;
  active: boolean;
  featured: boolean;
  bestseller: boolean;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface CartLine {
  productId: string;
  quantity: number;
  /** Client-side display snapshot only. Checkout always reloads prices from the database. */
  product?: Product;
}

export interface PricedCartLine {
  product: Product;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export type DiscountType = "percent" | "fixed";

export interface DiscountCode {
  code: string;
  type: DiscountType;
  value: number;
  minimumOrderValue: number;
  active: boolean;
  usageLimit?: number;
  usageCount: number;
}

export type ShippingMethodId = "packeta_home" | "packeta_pickup" | "personal_pickup" | "eu_delivery";
export type PaymentMethodId = "gopay" | "cash_on_delivery" | "bank_transfer";
export type OrderStatus =
  | "new"
  | "awaiting_payment"
  | "paid"
  | "processing"
  | "ready_for_pickup"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "archived";

export interface ShippingMethod {
  id: ShippingMethodId;
  name: LocalizedText;
  price: number;
}
