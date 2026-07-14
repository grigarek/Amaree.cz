import "server-only";
import Stripe from "stripe";
import type { CheckoutSessionInput, CheckoutSessionResult, PaymentProvider, PaymentWebhookResult } from "./provider";

export class StripePaymentProvider implements PaymentProvider {
  id = "stripe";
  private stripe: Stripe;

  constructor(secretKey = process.env.STRIPE_SECRET_KEY) {
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
    this.stripe = new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: input.customerEmail,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        orderId: input.orderId,
        orderNumber: input.orderNumber
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.total,
            product_data: {
              name: `Objednávka ${input.orderNumber}`
            }
          }
        }
      ]
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");

    return {
      provider: this.id,
      providerReference: session.id,
      redirectUrl: session.url
    };
  }

  async verifyWebhook(payload: string, signature: string | null): Promise<PaymentWebhookResult> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !signature) throw new Error("Stripe webhook secret or signature is missing.");

    const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
    if (event.type !== "checkout.session.completed") {
      return { provider: this.id, providerReference: event.id, status: "ignored", eventId: event.id };
    }

    const session = event.data.object as Stripe.Checkout.Session;
    return {
      provider: this.id,
      providerReference: session.id,
      status: session.payment_status === "paid" ? "paid" : "failed",
      eventId: event.id
    };
  }
}
