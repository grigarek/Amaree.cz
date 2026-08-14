export interface CheckoutSessionInput {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  currency: "CZK" | "EUR";
  total: number;
  successUrl: string;
  cancelUrl: string;
  notificationUrl: string;
  locale: "cs" | "sk" | "en" | "de";
}

export interface CheckoutSessionResult {
  provider: string;
  providerReference: string;
  redirectUrl: string;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "expired" | "refunded";

export interface PaymentStatusResult {
  provider: string;
  providerReference: string;
  status: PaymentStatus;
  rawStatus: string;
}

export interface PaymentProvider {
  id: string;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  getPaymentStatus(providerReference: string): Promise<PaymentStatusResult>;
}
