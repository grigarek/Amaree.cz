"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import type { Product } from "@/types/domain";

export function AddToCartButton({ product, disabled = false }: { product: Product; disabled?: boolean }) {
  const t = useTranslations("product");
  const addItem = useCartStore((state) => state.addItem);

  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-brand bg-ruby px-5 py-3 font-redhat text-sm font-semibold text-white transition hover:bg-rubyDark disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={() => addItem(product)}
      type="button"
    >
      <ShoppingBag size={18} />
      {t("addToCart")}
    </button>
  );
}
