import { z } from "zod";
import { isDateOnly } from "@/lib/discounts/dates";

const optionalDate = z.string().trim().nullable()
  .refine((value) => !value || isDateOnly(value), "Zadejte platné datum.")
  .transform((value) => value || null);

export const discountCodeInputSchema = z.object({
  internalName: z.string().trim().min(2, "Vyplňte interní název.").max(100),
  code: z.string().trim().toUpperCase()
    .min(3, "Kód musí mít alespoň 3 znaky.")
    .max(32, "Kód může mít nejvýše 32 znaků.")
    .regex(/^[A-Z0-9][A-Z0-9_-]*$/, "Použijte pouze písmena bez diakritiky, čísla, pomlčku nebo podtržítko."),
  discountType: z.enum(["percent", "fixed", "free_shipping"]),
  value: z.coerce.number().min(0, "Hodnota slevy nesmí být záporná."),
  currency: z.enum(["CZK", "EUR"]).nullable(),
  minimumOrderValue: z.coerce.number().min(0, "Minimální útrata nesmí být záporná."),
  usageLimit: z.coerce.number().int().positive().nullable(),
  active: z.boolean(),
  validFrom: optionalDate,
  validTo: optionalDate
}).superRefine((value, context) => {
  if (value.discountType === "percent" && (!Number.isInteger(value.value) || value.value > 100)) {
    context.addIssue({ code: "custom", path: ["value"], message: "Procentní sleva musí být celé číslo od 1 do 100." });
  }
  if (value.discountType === "fixed" && !value.currency) {
    context.addIssue({ code: "custom", path: ["currency"], message: "U pevné slevy vyberte měnu." });
  }
  if (value.discountType !== "free_shipping" && value.value <= 0) {
    context.addIssue({ code: "custom", path: ["value"], message: "Hodnota slevy musí být vyšší než nula." });
  }
  if (value.validFrom && value.validTo && value.validTo < value.validFrom) {
    context.addIssue({ code: "custom", path: ["validTo"], message: "Konec platnosti nesmí být dříve než začátek." });
  }
});

export type DiscountCodeInput = z.infer<typeof discountCodeInputSchema>;

export const discountValidationSchema = z.object({
  code: z.string().trim().min(1).max(64),
  currency: z.enum(["CZK", "EUR"]),
  locale: z.enum(["cs", "sk", "en", "de"]).default("cs"),
  lines: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(99)
  })).min(1).max(50)
});

export type DiscountValidationResult = {
  valid: boolean;
  code: string;
  amountMinor: number;
  freeShipping: boolean;
  subtotalMinor: number;
  currency: "CZK" | "EUR";
  message: string;
};
