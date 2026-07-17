"use client";

import { create } from "zustand";
import type { CartLine, Product } from "@/types/domain";

interface CartStore {
  lines: CartLine[];
  isOpen: boolean;
  discountCode: string;
  open: () => void;
  close: () => void;
  addItem: (product: Product | string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  setDiscountCode: (code: string) => void;
}

export const useCartStore = create<CartStore>((set) => ({
  lines: [],
  isOpen: false,
  discountCode: "",
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  addItem: (product, quantity = 1) =>
    set((state) => {
      const productId = typeof product === "string" ? product : product.id;
      const snapshot = typeof product === "string" ? undefined : product;
      const existing = state.lines.find((line) => line.productId === productId);
      if (existing) {
        return {
          isOpen: true,
          lines: state.lines.map((line) =>
            line.productId === productId ? { ...line, product: snapshot ?? line.product, quantity: line.quantity + quantity } : line
          )
        };
      }

      return { isOpen: true, lines: [...state.lines, { productId, quantity, product: snapshot }] };
    }),
  setQuantity: (productId, quantity) =>
    set((state) => ({
      lines: state.lines.map((line) => (line.productId === productId ? { ...line, quantity } : line)).filter((line) => line.quantity > 0)
    })),
  removeItem: (productId) =>
    set((state) => ({
      lines: state.lines.filter((line) => line.productId !== productId)
    })),
  clear: () => set({ lines: [], discountCode: "", isOpen: false }),
  setDiscountCode: (discountCode) => set({ discountCode })
}));
