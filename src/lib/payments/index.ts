import type { PaymentProvider } from "./provider";
import { GoPayPaymentProvider } from "./gopay";

export function getPaymentProvider(id = "gopay"): PaymentProvider {
  switch (id) {
    case "gopay":
      return new GoPayPaymentProvider();
    default:
      throw new Error(`Unsupported payment provider: ${id}`);
  }
}
