import "server-only";

import { createHash } from "node:crypto";

const fakturoidApiBase = "https://app.fakturoid.cz/api/v3";
const fakturoidUserAgent = "AMAREE e-shop (info@amaree.cz)";

type Fetcher = typeof fetch;

export type FakturoidConfig = {
  accountSlug: string;
  clientId: string;
  clientSecret: string;
};

export type FakturoidSubjectInput = {
  name: string;
  email: string;
  phone?: string | null;
  street: string;
  city: string;
  zip: string;
  country: "CZ" | "SK";
  deliveryName?: string;
  deliveryStreet?: string;
  deliveryCity?: string;
  deliveryZip?: string;
  deliveryCountry?: "CZ" | "SK";
};

export type FakturoidInvoiceLine = {
  name: string;
  quantity: string;
  unit_name: "ks";
  unit_price: string;
};

export type FakturoidInvoice = {
  id: number;
  custom_id: string;
  number: string;
  variable_symbol: string;
  status: string;
  html_url: string;
  public_html_url: string;
  pdf_url: string;
};

export type FakturoidAccountStatus = {
  subdomain: string;
  plan: string;
  api_calls_limit: number;
  api_calls_used: number;
  name: string;
  registration_no: string;
  vat_mode: "vat_payer" | "non_vat_payer" | "identified_person";
  currency: string;
};

export class FakturoidApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
    this.name = "FakturoidApiError";
  }
}

type Token = { value: string; expiresAt: number };

export function getFakturoidConfig(): FakturoidConfig | null {
  const accountSlug = process.env.FAKTUROID_ACCOUNT_SLUG?.trim();
  const clientId = process.env.FAKTUROID_CLIENT_ID?.trim();
  const clientSecret = process.env.FAKTUROID_CLIENT_SECRET?.trim();
  if (!accountSlug || !clientId || !clientSecret) return null;
  return { accountSlug, clientId, clientSecret };
}

export function fakturoidCustomerId(email: string) {
  return `amaree-customer-${createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 24)}`;
}

export class FakturoidClient {
  private token: Token | null = null;

  constructor(private readonly config: FakturoidConfig, private readonly fetcher: Fetcher = fetch) {}

  private async accessToken() {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const basic = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64");
    const response = await this.fetcher(`${fakturoidApiBase}/oauth/token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
        "User-Agent": fakturoidUserAgent
      },
      body: JSON.stringify({ grant_type: "client_credentials" })
    });
    const payload = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
    if (!response.ok || !payload.access_token) {
      throw new FakturoidApiError(payload.error ?? "authorization_failed", payload.error_description ?? "Přihlášení do Fakturoidu se nezdařilo.", response.status);
    }
    this.token = { value: payload.access_token, expiresAt: Date.now() + (payload.expires_in ?? 7200) * 1000 };
    return this.token.value;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.accessToken();
    const response = await this.fetcher(`${fakturoidApiBase}/accounts/${encodeURIComponent(this.config.accountSlug)}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": fakturoidUserAgent,
        ...init.headers
      }
    });
    if (response.status === 204) return undefined as T;
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      const code = typeof payload.error === "string" ? payload.error : `http_${response.status}`;
      const detail = typeof payload.error_description === "string"
        ? payload.error_description
        : payload.errors
          ? JSON.stringify(payload.errors)
          : "Fakturoid požadavek se nezdařil.";
      throw new FakturoidApiError(code, detail, response.status);
    }
    return payload as T;
  }

  async getAccountStatus() {
    return this.request<FakturoidAccountStatus>("/account.json");
  }

  async upsertCustomer(input: FakturoidSubjectInput) {
    const customId = fakturoidCustomerId(input.email);
    const existing = await this.request<Array<{ id: number }>>(`/subjects.json?custom_id=${encodeURIComponent(customId)}`);
    const deliveryDiffers = Boolean(input.deliveryStreet && (
      input.deliveryStreet !== input.street || input.deliveryCity !== input.city || input.deliveryZip !== input.zip
    ));
    const payload = {
      custom_id: customId,
      type: "customer",
      name: input.name,
      full_name: input.name,
      email: input.email,
      phone: input.phone || undefined,
      street: input.street,
      city: input.city,
      zip: input.zip.replace(/\s+/g, ""),
      country: input.country,
      has_delivery_address: deliveryDiffers,
      delivery_name: deliveryDiffers ? input.deliveryName ?? input.name : undefined,
      delivery_street: deliveryDiffers ? input.deliveryStreet : undefined,
      delivery_city: deliveryDiffers ? input.deliveryCity : undefined,
      delivery_zip: deliveryDiffers ? input.deliveryZip?.replace(/\s+/g, "") : undefined,
      delivery_country: deliveryDiffers ? input.deliveryCountry ?? input.country : undefined,
      setting_update_from_ares: "off"
    };
    if (existing[0]) return this.request<{ id: number }>(`/subjects/${existing[0].id}.json`, { method: "PATCH", body: JSON.stringify(payload) });
    return this.request<{ id: number }>("/subjects.json", { method: "POST", body: JSON.stringify(payload) });
  }

  async findInvoice(orderId: string) {
    const invoices = await this.request<FakturoidInvoice[]>(`/invoices.json?custom_id=${encodeURIComponent(orderId)}`);
    return invoices[0] ?? null;
  }

  async createInvoice(input: {
    orderId: string;
    subjectId: number;
    currency: "CZK" | "EUR";
    language: "cz" | "sk" | "en" | "de";
    paymentMethod: "bank" | "cod" | "card";
    variableSymbol?: string | null;
    dueDays: number;
    issuedOn: string;
    note: string;
    lines: FakturoidInvoiceLine[];
  }) {
    return this.request<FakturoidInvoice>("/invoices.json", {
      method: "POST",
      body: JSON.stringify({
        custom_id: input.orderId,
        document_type: "invoice",
        subject_id: input.subjectId,
        currency: input.currency,
        language: input.language,
        payment_method: input.paymentMethod,
        variable_symbol: input.variableSymbol || undefined,
        due: input.dueDays,
        issued_on: input.issuedOn,
        taxable_fulfillment_due: input.issuedOn,
        note: input.note,
        lines: input.lines
      })
    });
  }

  async markInvoicePaid(invoiceId: number, paidOn: string, variableSymbol?: string | null) {
    return this.request<{ id: number }>(`/invoices/${invoiceId}/payments.json`, {
      method: "POST",
      body: JSON.stringify({ paid_on: paidOn, variable_symbol: variableSymbol || undefined, send_thank_you_email: false })
    });
  }

  async sendInvoice(invoiceId: number, email: string, orderNumber: string) {
    return this.request<void>(`/invoices/${invoiceId}/message.json`, {
      method: "POST",
      body: JSON.stringify({
        email,
        subject: `Faktura k objednávce ${orderNumber}`,
        message: "Dobrý den,\n\nděkujeme za objednávku u AMARÉE. Fakturu naleznete na odkazu níže:\n#link#\n\nS přátelským pozdravem\nAMARÉE",
        replace_with_defaults: false
      })
    });
  }
}
