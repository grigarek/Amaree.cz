import type { Currency, PaymentMethodId, ShippingMethodId } from "@/types/domain";

export interface OrderEmailInput {
  to: string;
  orderNumber: string;
  locale: "cs" | "en" | "de";
  total: string;
  currency: Currency;
  paymentMethodId: PaymentMethodId;
  shippingMethodId: ShippingMethodId;
  variableSymbol?: string;
  bankTransferDueDate?: string;
}

export interface EmailProvider {
  sendOrderConfirmation(input: OrderEmailInput): Promise<void>;
}
