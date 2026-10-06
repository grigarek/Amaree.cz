export const orderStatuses = [
  "new", "awaiting_payment", "paid", "processing", "ready_for_pickup",
  "shipped", "delivered", "cancelled", "refunded", "archived"
] as const;

export type AdminOrderStatus = (typeof orderStatuses)[number];

export const selectableOrderStatuses = orderStatuses.filter((status) => status !== "ready_for_pickup");

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
  | "order_received" | "awaiting_online_payment" | "awaiting_bank_transfer" | "payment_confirmed" | "payment_failed"
  | "order_processing" | "ready_for_pickup" | "order_shipped" | "shipment_ready_for_collection" | "order_delivered"
  | "order_cancelled" | "payment_refunded" | "withdrawal_received";

export const orderTemplateKeys = [
  "order_received", "awaiting_online_payment", "awaiting_bank_transfer", "payment_confirmed", "payment_failed",
  "order_processing", "ready_for_pickup", "order_shipped", "shipment_ready_for_collection", "order_delivered",
  "order_cancelled", "payment_refunded", "withdrawal_received"
] as const satisfies readonly OrderTemplateKey[];

export const selectableOrderTemplateKeys = orderTemplateKeys.filter((template) => template !== "ready_for_pickup");

export const orderTemplateLabels: Record<OrderTemplateKey, string> = {
  order_received: "Potvrzení přijetí objednávky",
  awaiting_online_payment: "Čekáme na online platbu",
  awaiting_bank_transfer: "Pokyny k bankovnímu převodu",
  payment_confirmed: "Potvrzení přijaté platby",
  payment_failed: "Platba se nezdařila",
  order_processing: "Objednávku připravujeme",
  ready_for_pickup: "Objednávka je připravena k vyzvednutí",
  order_shipped: "Zásilka byla předána dopravci",
  shipment_ready_for_collection: "Zásilka je připravena k vyzvednutí",
  order_delivered: "Objednávka byla doručena",
  order_cancelled: "Objednávka byla zrušena",
  payment_refunded: "Platba byla vrácena",
  withdrawal_received: "Přijetí odstoupení od smlouvy"
};

const statusTemplate: Partial<Record<AdminOrderStatus, OrderTemplateKey>> = {
  new: "order_received",
  paid: "payment_confirmed",
  processing: "order_processing",
  ready_for_pickup: "ready_for_pickup",
  shipped: "order_shipped",
  delivered: "order_delivered",
  cancelled: "order_cancelled",
  refunded: "payment_refunded"
};

export function templateForOrderStatus(status: AdminOrderStatus, paymentMethod?: string) {
  if (status === "awaiting_payment") return paymentMethod === "gopay" ? "awaiting_online_payment" : "awaiting_bank_transfer";
  return statusTemplate[status] ?? null;
}
