import { z } from "zod";
import type { Locale } from "@/i18n/routing";

export const packetaPickupPointSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  street: z.string().trim().min(1),
  city: z.string().trim().min(1),
  zip: z.string().trim().min(3),
  country: z.string().trim().length(2).transform((value) => value.toLowerCase()),
  type: z.enum(["pickup-point", "zbox"])
});

export type PacketaPickupPoint = z.infer<typeof packetaPickupPointSchema>;

export interface PacketaValidationResult {
  valid: boolean;
  point?: PacketaPickupPoint;
  errors: string[];
  mode: "mock" | "remote";
}

export const mockPacketaPoint: PacketaPickupPoint = {
  id: "mock-packeta-olomouc-01",
  name: "Testovací výdejní místo AMARÉE",
  street: "Testovací 1",
  city: "Olomouc",
  zip: "779 00",
  country: "cz",
  type: "pickup-point"
};

type PacketaValidationResponse = {
  isValid?: boolean;
  point?: {
    name?: string;
    group?: string;
    address?: { street?: string; city?: string; zip?: string; country?: string };
  };
  errors?: Array<{ code?: string; description?: string }>;
};

export async function validatePacketaPickupPoint(
  input: unknown,
  locale: Locale,
  fetcher: typeof fetch = fetch
): Promise<PacketaValidationResult> {
  const parsed = packetaPickupPointSchema.safeParse(input);
  if (!parsed.success) {
    return { valid: false, errors: ["invalid_selection_payload"], mode: getValidationMode() };
  }

  const mode = getValidationMode();
  if (mode === "mock") {
    const valid = parsed.data.id === mockPacketaPoint.id;
    return {
      valid,
      point: valid ? mockPacketaPoint : undefined,
      errors: valid ? [] : ["unknown_mock_pickup_point"],
      mode
    };
  }

  const apiKey = process.env.NEXT_PUBLIC_PACKETA_WIDGET_API_KEY;
  if (!apiKey) {
    return { valid: false, errors: ["packeta_widget_api_key_missing"], mode };
  }

  const response = await fetcher("https://widget.packeta.com/v6/pps/api/widget/v1/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Language": locale
    },
    body: JSON.stringify({
      apiKey,
      point: { id: parsed.data.id },
      options: {
        country: parsed.data.country,
        carriers: "packeta",
        vendors: [{ country: parsed.data.country }]
      }
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    return { valid: false, errors: [`packeta_validation_http_${response.status}`], mode };
  }

  const result = (await response.json()) as PacketaValidationResponse;
  if (!result.isValid || !result.point?.address || !result.point.name) {
    return {
      valid: false,
      errors: result.errors?.map((error) => error.code ?? error.description ?? "packeta_validation_failed") ?? ["packeta_validation_failed"],
      mode
    };
  }

  const canonical = packetaPickupPointSchema.safeParse({
    id: parsed.data.id,
    name: result.point.name,
    street: result.point.address.street,
    city: result.point.address.city,
    zip: result.point.address.zip,
    country: result.point.address.country,
    type: result.point.group === "zbox" ? "zbox" : "pickup-point"
  });

  return canonical.success
    ? { valid: true, point: canonical.data, errors: [], mode }
    : { valid: false, errors: ["invalid_packeta_validation_response"], mode };
}

function getValidationMode(): "mock" | "remote" {
  return ["api", "remote"].includes(process.env.PACKETA_VALIDATION_MODE ?? "") ? "remote" : "mock";
}
