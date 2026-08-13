import type { CartLine } from "@/types/domain";
import { isGiftCardDesignId, type GiftCardDesignId } from "@/lib/gift-cards";

type CartCurrency = "CZK" | "EUR";

type PersistedCartState = {
  lines?: CartLine[];
  discountCode?: string;
  discountAmount?: number;
  discountFreeShipping?: boolean;
  discountMessage?: string;
  discountValid?: boolean;
  giftCardDesignId?: GiftCardDesignId | null;
};

export function sanitizePersistedCartState(state: unknown, currency: CartCurrency): PersistedCartState {
  if (!state || typeof state !== "object") return { lines: [] };

  const persisted = state as PersistedCartState;
  const originalLines = Array.isArray(persisted.lines) ? persisted.lines : [];
  const lines = originalLines.filter((line) => line.product?.currency === currency);

  return {
    ...persisted,
    lines,
    giftCardDesignId: lines.length && isGiftCardDesignId(persisted.giftCardDesignId) ? persisted.giftCardDesignId : null,
    // A coupon may be edited, disabled or expire between visits. Keep its code
    // for convenience, but always require a fresh server-side validation.
    discountCode: lines.length === originalLines.length ? persisted.discountCode : "",
    discountAmount: 0,
    discountFreeShipping: false,
    discountMessage: "",
    discountValid: false
  };
}
