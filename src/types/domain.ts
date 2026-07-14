import type { Locale } from "@/i18n/routing";

export type { Locale };

export type Currency = "CZK";
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
  dimensions: LocalizedText;
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

export type ShippingMethodId = "zasilkovna" | "ppl" | "pickup";

export interface ShippingMethod {
  id: ShippingMethodId;
  name: LocalizedText;
  price: number;
}
