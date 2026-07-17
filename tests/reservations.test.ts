import { describe, expect, it } from "vitest";
import { calculateAvailableStock, commitReservation, confirmBankTransfer, createStockReservation, expireReservation } from "@/lib/inventory/reservations";

const now = new Date("2026-07-15T12:00:00.000Z");

describe("stock reservations", () => {
  it("reserves GoPay orders for 30 minutes", () => {
    const reservation = createStockReservation({ orderId: "o1", productId: "p1", quantity: 1, paymentMethodId: "gopay", now });
    expect(reservation.status).toBe("active");
    expect(reservation.expiresAt).toBe("2026-07-15T12:30:00.000Z");
  });

  it("reserves bank transfers for three calendar days", () => {
    const reservation = createStockReservation({ orderId: "o2", productId: "p1", quantity: 1, paymentMethodId: "bank_transfer", now });
    expect(reservation.expiresAt).toBe("2026-07-18T12:00:00.000Z");
  });

  it("releases an unpaid reservation only after expiry", () => {
    const reservation = createStockReservation({ orderId: "o1", productId: "p1", quantity: 1, paymentMethodId: "gopay", now });
    expect(expireReservation(reservation, new Date("2026-07-15T12:29:59.000Z")).changed).toBe(false);
    expect(expireReservation(reservation, new Date("2026-07-15T12:30:00.000Z"))).toMatchObject({ changed: true, reservation: { status: "released" } });
  });

  it("commits cash-on-delivery stock immediately", () => {
    expect(createStockReservation({ orderId: "o3", productId: "p1", quantity: 1, paymentMethodId: "cash_on_delivery", now })).toMatchObject({ status: "committed", expiresAt: null });
  });

  it("does not commit the same GoPay reservation twice", () => {
    const active = createStockReservation({ orderId: "o1", productId: "p1", quantity: 1, paymentMethodId: "gopay", now });
    const first = commitReservation(active);
    expect(first.changed).toBe(true);
    expect(commitReservation(first.reservation).changed).toBe(false);
  });

  it("records one manual bank confirmation and ignores a duplicate", () => {
    const active = createStockReservation({ orderId: "o2", productId: "p1", quantity: 1, paymentMethodId: "bank_transfer", now });
    const first = confirmBankTransfer(active, { receivedAt: "2026-07-16T10:00:00.000Z", confirmedBy: "admin@example.test" });
    expect(first).toMatchObject({ changed: true, audit: { confirmedBy: "admin@example.test" } });
    expect(confirmBankTransfer(first.reservation, { receivedAt: "2026-07-16T10:01:00.000Z", confirmedBy: "other@example.test" })).toMatchObject({ changed: false, audit: null });
  });

  it("excludes active reservations from sellable stock", () => {
    const active = createStockReservation({ orderId: "o1", productId: "p1", quantity: 2, paymentMethodId: "gopay", now });
    expect(calculateAvailableStock(2, [active])).toBe(0);
  });
});
