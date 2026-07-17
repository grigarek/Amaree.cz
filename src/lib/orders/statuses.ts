export const orderStatuses = [
  "new", "awaiting_payment", "paid", "processing", "ready_for_pickup",
  "shipped", "delivered", "cancelled", "refunded", "archived"
] as const;

export type AdminOrderStatus = (typeof orderStatuses)[number];

export const orderStatusLabels: Record<AdminOrderStatus, string> = {
  new: "Nová",
  awaiting_payment: "Čeká na platbu",
  paid: "Zaplaceno",
  processing: "Připravuje se",
  ready_for_pickup: "Připraveno k vyzvednutí",
  shipped: "Odesláno",
  delivered: "Doručeno",
  cancelled: "Zrušeno",
  refunded: "Vrácená platba",
  archived: "Archivováno"
};

export type OrderTemplateKey =
  | "order_received" | "awaiting_bank_transfer" | "payment_confirmed" | "payment_failed"
  | "order_processing" | "ready_for_pickup" | "order_shipped" | "order_cancelled" | "payment_refunded";

const statusTemplate: Partial<Record<AdminOrderStatus, OrderTemplateKey>> = {
  new: "order_received",
  awaiting_payment: "awaiting_bank_transfer",
  paid: "payment_confirmed",
  processing: "order_processing",
  ready_for_pickup: "ready_for_pickup",
  shipped: "order_shipped",
  cancelled: "order_cancelled",
  refunded: "payment_refunded"
};

export function templateForOrderStatus(status: AdminOrderStatus) {
  return statusTemplate[status] ?? null;
}
