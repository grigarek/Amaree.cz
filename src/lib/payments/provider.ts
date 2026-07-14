export interface CheckoutSessionInput {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  currency: "CZK";
  total: number;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  provider: string;
  providerReference: string;
  redirectUrl: string;
}

export interface PaymentWebhookResult {
  provider: string;
  providerReference: string;
  status: "paid" | "failed" | "ignored";
  eventId: string;
}

export interface PaymentProvider {
  id: string;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  verifyWebhook(payload: string, signature: string | null): Promise<PaymentWebhookResult>;
}
