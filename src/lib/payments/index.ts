import type { PaymentProvider } from "./provider";
import { StripePaymentProvider } from "./stripe";

export function getPaymentProvider(id = "stripe"): PaymentProvider {
  switch (id) {
    case "stripe":
      return new StripePaymentProvider();
    default:
      throw new Error(`Unsupported payment provider: ${id}`);
  }
}
