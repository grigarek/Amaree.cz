import { commerceConfig } from "@/lib/commerce/config";
import type { PaymentMethodId } from "@/types/domain";

export type ReservationStatus = "active" | "committed" | "released";

export type StockReservation = {
  orderId: string;
  productId: string;
  quantity: number;
  paymentMethodId: PaymentMethodId;
  status: ReservationStatus;
  createdAt: string;
  expiresAt: string | null;
};

export function createStockReservation(input: {
  orderId: string;
  productId: string;
  quantity: number;
  paymentMethodId: PaymentMethodId;
  now?: Date;
}): StockReservation {
  const now = input.now ?? new Date();
  const minutes = commerceConfig.reservationMinutes[input.paymentMethodId];
  const commitsImmediately = input.paymentMethodId === "cash_on_delivery" || input.paymentMethodId === "cash_on_pickup";

  return {
    ...input,
    status: commitsImmediately ? "committed" : "active",
    createdAt: now.toISOString(),
    expiresAt: commitsImmediately ? null : new Date(now.getTime() + minutes * 60_000).toISOString()
  };
}

export function commitReservation(reservation: StockReservation) {
  if (reservation.status !== "active") return { reservation, changed: false } as const;
  return { reservation: { ...reservation, status: "committed" as const }, changed: true } as const;
}

export function expireReservation(reservation: StockReservation, now = new Date()) {
  if (reservation.status !== "active" || !reservation.expiresAt || now < new Date(reservation.expiresAt)) {
    return { reservation, changed: false } as const;
  }
  return { reservation: { ...reservation, status: "released" as const }, changed: true } as const;
}

export function calculateAvailableStock(onHand: number, reservations: StockReservation[]): number {
  const reserved = reservations
    .filter((reservation) => reservation.status === "active")
    .reduce((total, reservation) => total + reservation.quantity, 0);
  return Math.max(onHand - reserved, 0);
}

export function confirmBankTransfer(
  reservation: StockReservation,
  audit: { receivedAt: string; confirmedBy: string }
) {
  if (reservation.paymentMethodId !== "bank_transfer") throw new Error("reservation_is_not_bank_transfer");
  const result = commitReservation(reservation);
  return {
    ...result,
    audit: result.changed ? audit : null
  };
}
