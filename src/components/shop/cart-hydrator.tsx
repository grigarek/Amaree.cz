"use client";

import { useEffect } from "react";
import type { Locale } from "@/i18n/routing";
import { setCartHydrationCurrency, useCartStore } from "@/store/cart-store";

export function CartHydrator({ locale }: { locale: Locale }) {
  useEffect(() => {
    let cancelled = false;

    setCartHydrationCurrency(locale === "sk" ? "EUR" : "CZK");
    void (async () => {
      await useCartStore.persist.rehydrate();
      const { lines, discountCode, setDiscountResult } = useCartStore.getState();
      if (!discountCode.trim() || !lines.length || cancelled) return;

      try {
        const response = await fetch("/api/discounts/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: discountCode,
            currency: locale === "sk" ? "EUR" : "CZK",
            locale,
            lines: lines.map(({ productId, quantity }) => ({ productId, quantity }))
          })
        });
        const result = await response.json() as { valid?: boolean; amountMinor?: number; freeShipping?: boolean; message?: string; error?: string };
        if (!cancelled) {
          setDiscountResult(
            response.ok && result.valid ? result.amountMinor ?? 0 : 0,
            result.message ?? result.error ?? "",
            Boolean(response.ok && result.valid),
            Boolean(response.ok && result.valid && result.freeShipping)
          );
        }
      } catch {
        if (!cancelled) setDiscountResult(0, "", false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  return null;
}
