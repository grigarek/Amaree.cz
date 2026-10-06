"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartLine, Product } from "@/types/domain";
import { sanitizePersistedCartState } from "@/lib/cart-persistence";
import type { GiftCardDesignId } from "@/lib/gift-cards";

let hydrationCurrency: "CZK" | "EUR" = "CZK";

export function setCartHydrationCurrency(currency: "CZK" | "EUR") {
  hydrationCurrency = currency;
}

interface CartStore {
  lines: CartLine[];
  isOpen: boolean;
  discountCode: string;
  discountAmount: number;
  discountFreeShipping: boolean;
  discountMessage: string;
  discountValid: boolean;
  giftCardDesignId: GiftCardDesignId | null;
  open: () => void;
  close: () => void;
  addItem: (product: Product | string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  setDiscountCode: (code: string) => void;
  setDiscountResult: (amount: number, message: string, valid: boolean, freeShipping?: boolean) => void;
  clearDiscount: () => void;
  setGiftCardDesign: (giftCardDesignId: GiftCardDesignId | null) => void;
}

export const useCartStore = create<CartStore>()(persist((set) => ({
  lines: [],
  isOpen: false,
  discountCode: "",
  discountAmount: 0,
  discountFreeShipping: false,
  discountMessage: "",
  discountValid: false,
  giftCardDesignId: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  addItem: (product, quantity = 1) =>
    set((state) => {
      const productId = typeof product === "string" ? product : product.id;
      const snapshot = typeof product === "string" ? undefined : product;
      const existing = state.lines.find((line) => line.productId === productId);
      if (existing) {
        return {
          isOpen: true, discountAmount: 0, discountFreeShipping: false, discountMessage: "", discountValid: false,
          lines: state.lines.map((line) =>
            line.productId === productId ? { ...line, product: snapshot ?? line.product, quantity: line.quantity + quantity } : line
          )
        };
      }

      return { isOpen: true, discountAmount: 0, discountFreeShipping: false, discountMessage: "", discountValid: false, lines: [...state.lines, { productId, quantity, product: snapshot }] };
    }),
  setQuantity: (productId, quantity) =>
    set((state) => {
      const lines = state.lines.map((line) => (line.productId === productId ? { ...line, quantity } : line)).filter((line) => line.quantity > 0);
      return { lines, giftCardDesignId: lines.length ? state.giftCardDesignId : null, discountAmount: 0, discountFreeShipping: false, discountMessage: "", discountValid: false };
    }),
  removeItem: (productId) =>
    set((state) => {
      const lines = state.lines.filter((line) => line.productId !== productId);
      return { lines, giftCardDesignId: lines.length ? state.giftCardDesignId : null, discountAmount: 0, discountFreeShipping: false, discountMessage: "", discountValid: false };
    }),
  clear: () => set({ lines: [], giftCardDesignId: null, discountCode: "", discountAmount: 0, discountFreeShipping: false, discountMessage: "", discountValid: false, isOpen: false }),
  setDiscountCode: (discountCode) => set({ discountCode, discountAmount: 0, discountFreeShipping: false, discountMessage: "", discountValid: false }),
  setDiscountResult: (discountAmount, discountMessage, discountValid, discountFreeShipping = false) => set({ discountAmount, discountFreeShipping, discountMessage, discountValid }),
  clearDiscount: () => set({ discountAmount: 0, discountFreeShipping: false, discountMessage: "", discountValid: false }),
  setGiftCardDesign: (giftCardDesignId) => set({ giftCardDesignId })
}), {
  name: "amaree-cart-v1",
  storage: createJSONStorage(() => localStorage),
  skipHydration: true,
  partialize: (state) => ({
    lines: state.lines,
    discountCode: state.discountCode,
    giftCardDesignId: state.giftCardDesignId
  }),
  merge: (persistedState, currentState) => ({
    ...currentState,
    ...sanitizePersistedCartState(persistedState, hydrationCurrency)
  })
}));
