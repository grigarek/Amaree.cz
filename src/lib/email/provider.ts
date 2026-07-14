export interface OrderEmailInput {
  to: string;
  orderNumber: string;
  locale: "cs" | "en" | "de";
  total: string;
}

export interface EmailProvider {
  sendOrderConfirmation(input: OrderEmailInput): Promise<void>;
}
