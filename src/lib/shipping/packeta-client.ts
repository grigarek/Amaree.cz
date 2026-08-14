import "server-only";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { getAppEnvironment } from "@/lib/environment";
import { getPacketaOperationalSettings } from "@/lib/admin/integration-settings";

const apiUrl = "https://www.zasilkovna.cz/api/rest";

export type PacketaCreateInput = {
  orderNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  currency: "CZK" | "EUR";
  valueMinor: number;
  cashOnDeliveryMinor: number;
  country: "CZ" | "SK";
  shippingMethod: string;
  pickupPointId: string | null;
  shippingAddress: Record<string, string>;
};

export type PacketaPacket = { packetId: string; barcode: string; trackingUrl: string };
export type PacketaPacketStatus = {
  statusCode: number;
  codeText: string;
  statusText: string;
  dateTime: string | null;
  externalTrackingCode: string | null;
  raw: unknown;
};

type PacketaConfig = {
  apiPassword: string;
  sender?: string;
  defaultWeightKg: number;
  homeCarrierIdCz?: string;
  homeCarrierIdSk?: string;
};

const builder = new XMLBuilder({ ignoreAttributes: false, format: false });
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true });

function readPacketaFault(value: unknown): string | null {
  const messages = new Set<string>();

  function visit(node: unknown) {
    if (typeof node === "string") {
      const message = node.trim();
      if (message && message !== "PacketAttributesFault") messages.add(message);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    Object.values(node as Record<string, unknown>).forEach(visit);
  }

  visit(value);
  const detail = [...messages].join(": ");
  return detail.slice(0, 400) || null;
}

function money(minor: number) {
  return (minor / 100).toFixed(2);
}

function splitStreet(value: string) {
  const match = value.trim().match(/^(.*?)(?:\s+)(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)$/);
  return match ? { street: match[1], houseNumber: match[2] } : { street: value.trim(), houseNumber: "-" };
}

async function readConfig(): Promise<PacketaConfig> {
  if (process.env.PACKETA_API_ENABLED !== "true") throw new Error("packeta_api_disabled");
  const apiPassword = process.env.PACKETA_API_PASSWORD;
  const settings = await getPacketaOperationalSettings();
  const sender = settings.senderLabel.trim() || process.env.PACKETA_SENDER?.trim() || undefined;
  if (!apiPassword) throw new Error("packeta_configuration_missing");
  if (getAppEnvironment() !== "production" && process.env.PACKETA_ENVIRONMENT !== "test") {
    throw new Error("packeta_test_environment_required");
  }
  return {
    apiPassword,
    sender,
    defaultWeightKg: settings.defaultWeightKg || Number(process.env.PACKETA_DEFAULT_WEIGHT_KG ?? "0.5"),
    homeCarrierIdCz: settings.homeCarrierIdCz || process.env.PACKETA_HOME_CARRIER_ID_CZ,
    homeCarrierIdSk: settings.homeCarrierIdSk || process.env.PACKETA_HOME_CARRIER_ID_SK
  };
}

async function callPacketa<T>(method: string, body: Record<string, unknown>, fetcher: typeof fetch): Promise<T> {
  const xml = builder.build({ [method]: body });
  const response = await fetcher(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/xml; charset=utf-8" },
    body: xml,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`packeta_http_${response.status}`);
  const responseText = await response.text();
  const parsed = parser.parse(responseText) as { response?: { status?: string; result?: T; fault?: string | Record<string, unknown> } };
  if (parsed.response?.status !== "ok" || parsed.response.result === undefined) {
    const fault = readPacketaFault(parsed.response?.fault);
    const responseDetail = responseText
      .replace(/<apiPassword>.*?<\/apiPassword>/gis, "<apiPassword>[redacted]</apiPassword>")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 800);
    throw new Error(`packeta_api_rejected_request: ${fault ?? responseDetail ?? "unknown_fault"}`);
  }
  return parsed.response.result;
}

export async function createPacketaPacket(input: PacketaCreateInput, fetcher: typeof fetch = fetch): Promise<PacketaPacket> {
  const config = await readConfig();
  const addressId = input.shippingMethod === "packeta_pickup"
    ? input.pickupPointId
    : input.country === "CZ" ? config.homeCarrierIdCz : config.homeCarrierIdSk;
  if (!addressId || !/^\d+$/.test(addressId)) throw new Error("packeta_address_id_missing");
  const street = splitStreet(input.shippingAddress.street ?? "");
  const packetAttributes: Record<string, unknown> = {
    number: input.orderNumber,
    name: input.firstName,
    surname: input.lastName,
    email: input.email,
    phone: input.phone ?? undefined,
    addressId,
    value: money(input.valueMinor),
    currency: input.currency,
    weight: config.defaultWeightKg,
  };
  if (config.sender) packetAttributes.eshop = config.sender;
  if (input.cashOnDeliveryMinor > 0) packetAttributes.cod = money(input.cashOnDeliveryMinor);
  if (input.shippingMethod !== "packeta_pickup") {
    Object.assign(packetAttributes, {
      street: street.street,
      houseNumber: street.houseNumber,
      city: input.shippingAddress.city,
      zip: input.shippingAddress.postalCode
    });
  }
  const result = await callPacketa<{ id?: string | number; barcode?: string }>("createPacket", {
    apiPassword: config.apiPassword,
    packetAttributes
  }, fetcher);
  if (!result.id || !result.barcode) throw new Error("packeta_create_response_incomplete");
  const packetId = String(result.id);
  const barcode = String(result.barcode);
  return { packetId, barcode, trackingUrl: createPacketaTrackingUrl(barcode, input.country === "CZ" ? "cs" : "sk") };
}

export async function getPacketaLabelPdf(packetId: string, fetcher: typeof fetch = fetch): Promise<Buffer> {
  if (!/^\d+$/.test(packetId)) throw new Error("packeta_packet_id_invalid");
  const config = await readConfig();
  const result = await callPacketa<string>("packetLabelPdf", {
    apiPassword: config.apiPassword,
    packetId,
    format: "A6 on A6",
    offset: 0
  }, fetcher);
  const pdf = Buffer.from(result, "base64");
  if (pdf.subarray(0, 4).toString("ascii") !== "%PDF") throw new Error("packeta_label_invalid");
  return pdf;
}

export async function getPacketaCourierNumber(packetId: string, fetcher: typeof fetch = fetch): Promise<string> {
  if (!/^\d+$/.test(packetId)) throw new Error("packeta_packet_id_invalid");
  const config = await readConfig();
  const result = await callPacketa<string | number>("packetCourierNumber", {
    apiPassword: config.apiPassword,
    packetId
  }, fetcher);
  const courierNumber = String(result).trim();
  if (!courierNumber) throw new Error("packeta_courier_number_missing");
  return courierNumber;
}

export async function getPacketaCourierLabelPdf(packetId: string, courierNumber: string, fetcher: typeof fetch = fetch): Promise<Buffer> {
  if (!/^\d+$/.test(packetId) || !courierNumber.trim()) throw new Error("packeta_courier_label_input_invalid");
  const config = await readConfig();
  const result = await callPacketa<string>("packetCourierLabelPdf", {
    apiPassword: config.apiPassword,
    packetId,
    courierNumber
  }, fetcher);
  const pdf = Buffer.from(result, "base64");
  if (pdf.subarray(0, 4).toString("ascii") !== "%PDF") throw new Error("packeta_label_invalid");
  return pdf;
}

function findStatusRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const found = findStatusRecord(value[index]);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.statusCode !== undefined || record.code !== undefined) return record;
  for (const nested of Object.values(record)) {
    const found = findStatusRecord(nested);
    if (found) return found;
  }
  return null;
}

export async function getPacketaPacketStatus(packetId: string, fetcher: typeof fetch = fetch): Promise<PacketaPacketStatus> {
  if (!/^\d+$/.test(packetId)) throw new Error("packeta_packet_id_invalid");
  const config = await readConfig();
  const raw = await callPacketa<unknown>("packetStatus", {
    apiPassword: config.apiPassword,
    packetId
  }, fetcher);
  const record = findStatusRecord(raw);
  if (!record) throw new Error("packeta_status_response_incomplete");
  const statusCode = Number(record.statusCode ?? record.code);
  if (!Number.isInteger(statusCode)) throw new Error("packeta_status_code_invalid");
  return {
    statusCode,
    codeText: String(record.codeText ?? record.statusCodeText ?? ""),
    statusText: String(record.statusText ?? record.text ?? ""),
    dateTime: record.dateTime ? String(record.dateTime) : null,
    externalTrackingCode: record.externalTrackingCode ? String(record.externalTrackingCode) : null,
    raw
  };
}

export function createPacketaTrackingUrl(trackingNumber: string, locale: "cs" | "sk" = "cs") {
  return `https://tracking.packeta.com/${locale}/?id=${encodeURIComponent(trackingNumber)}`;
}
