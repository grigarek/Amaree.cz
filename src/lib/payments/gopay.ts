import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  PaymentProvider,
  PaymentStatus,
  PaymentStatusResult
} from "./provider";
import { logPaymentLifecycle } from "./logging";

type GoPayEnvironment = "sandbox" | "production";

type GoPayConfig = {
  environment: GoPayEnvironment;
  goId: string;
  clientId: string;
  clientSecret: string;
};

type GoPayTokenResponse = { access_token?: string };
type GoPayPaymentResponse = { id?: number | string; gw_url?: string; state?: string };

export class GoPayPaymentProvider implements PaymentProvider {
  id = "gopay";
  private config: GoPayConfig;
  private fetcher: typeof fetch;

  constructor(config = readGoPayConfig(), fetcher: typeof fetch = fetch) {
    this.config = config;
    this.fetcher = fetcher;
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const token = await this.getAccessToken("payment-create");
    const response = await this.fetcher(`${getBaseUrl(this.config.environment)}/payments/payment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        payer: {
          contact: { email: input.customerEmail }
        },
        target: { type: "ACCOUNT", goid: Number(this.config.goId) },
        amount: input.total,
        currency: input.currency,
        order_number: input.orderNumber,
        order_description: `AMARÉE objednávka ${input.orderNumber}`,
        items: [{ name: `AMARÉE objednávka ${input.orderNumber}`, amount: input.total, count: 1 }],
        callback: {
          return_url: input.successUrl,
          notification_url: input.notificationUrl
        },
        lang: input.locale.toUpperCase()
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000)
    });

    const payment = await parseGoPayResponse<GoPayPaymentResponse>(response, "payment_create_failed");
    if (!payment.id || !payment.gw_url) throw new Error("gopay_payment_response_incomplete");

    logPaymentLifecycle("payment_created", {
      provider: "gopay",
      providerReference: String(payment.id),
      orderNumber: input.orderNumber,
      status: mapGoPayStatus(payment.state ?? "CREATED")
    });

    return {
      provider: this.id,
      providerReference: String(payment.id),
      redirectUrl: payment.gw_url
    };
  }

  async getPaymentStatus(providerReference: string): Promise<PaymentStatusResult> {
    if (!/^\d+$/.test(providerReference)) throw new Error("invalid_gopay_payment_id");
    const token = await this.getAccessToken("payment-all");
    const response = await this.fetcher(
      `${getBaseUrl(this.config.environment)}/payments/payment/${encodeURIComponent(providerReference)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000)
      }
    );
    const payment = await parseGoPayResponse<GoPayPaymentResponse>(response, "payment_status_failed");
    const rawStatus = payment.state ?? "UNKNOWN";
    const result = {
      provider: this.id,
      providerReference,
      status: mapGoPayStatus(rawStatus),
      rawStatus
    };
    logPaymentLifecycle("payment_status_checked", {
      provider: "gopay",
      providerReference,
      status: result.status
    });
    return result;
  }

  private async getAccessToken(scope: "payment-create" | "payment-all"): Promise<string> {
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64");
    const response = await this.fetcher(`${getBaseUrl(this.config.environment)}/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ grant_type: "client_credentials", scope }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000)
    });
    const token = await parseGoPayResponse<GoPayTokenResponse>(response, "oauth_failed");
    if (!token.access_token) throw new Error("gopay_access_token_missing");
    return token.access_token;
  }
}

export function mapGoPayStatus(state: string): PaymentStatus {
  switch (state) {
    case "PAID":
      return "paid";
    case "CANCELED":
    case "CANCELLED":
      return "cancelled";
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "refunded";
    case "TIMEOUTED":
      return "expired";
    case "CREATED":
    case "PAYMENT_CREATED":
    case "PAYMENT_METHOD_CHOSEN":
    case "AUTHORIZED":
    default:
      return "pending";
  }
}

function readGoPayConfig(): GoPayConfig {
  const environment = process.env.GOPAY_ENVIRONMENT === "production" ? "production" : "sandbox";
  const goId = process.env.GOPAY_GO_ID;
  const clientId = process.env.GOPAY_CLIENT_ID;
  const clientSecret = process.env.GOPAY_CLIENT_SECRET;
  if (!goId || !clientId || !clientSecret) throw new Error("gopay_credentials_missing");
  if (environment === "production" && process.env.GOPAY_CHECKOUT_ENABLED !== "true") {
    throw new Error("gopay_production_checkout_disabled");
  }
  return { environment, goId, clientId, clientSecret };
}

function getBaseUrl(environment: GoPayEnvironment): string {
  return environment === "production" ? "https://gate.gopay.cz/api" : "https://gw.sandbox.gopay.com/api";
}

async function parseGoPayResponse<T>(response: Response, errorCode: string): Promise<T> {
  if (!response.ok) throw new Error(`${errorCode}_${response.status}`);
  return (await response.json()) as T;
}
