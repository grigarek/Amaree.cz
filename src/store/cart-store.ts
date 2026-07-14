"use client";

import { create } from "zustand";
import type { CartLine } from "@/types/domain";

interface CartStore {
  lines: CartLine[];
  isOpen: boolean;
  discountCode: string;
  open: () => void;
  close: () => void;
  addItem: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  setDiscountCode: (code: string) => void;
}

export const useCartStore = create<CartStore>((set) => ({
  lines: [],
  isOpen: false,
  discountCode: "",
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  addItem: (productId, quantity = 1) =>
    set((state) => {
      const existing = state.lines.find((line) => line.productId === productId);
      if (existing) {
        return {
          isOpen: true,
          lines: state.lines.map((line) =>
            line.productId === productId ? { ...line, quantity: line.quantity + quantity } : line
          )
        };
      }

      return { isOpen: true, lines: [...state.lines, { productId, quantity }] };
    }),
  setQuantity: (productId, quantity) =>
    set((state) => ({
      lines: state.lines.map((line) => (line.productId === productId ? { ...line, quantity } : line)).filter((line) => line.quantity > 0)
    })),
  removeItem: (productId) =>
    set((state) => ({
      lines: state.lines.filter((line) => line.productId !== productId)
    })),
  setDiscountCode: (discountCode) => set({ discountCode })
}));
