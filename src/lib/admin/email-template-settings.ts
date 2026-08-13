import "server-only";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const editableTemplateSchema = z.object({
  subjectCs: z.string().trim().min(1).max(140),
  statusCs: z.string().trim().min(1).max(80),
  introCs: z.string().trim().min(1).max(600),
  subjectSk: z.string().trim().min(1).max(140),
  statusSk: z.string().trim().min(1).max(80),
  introSk: z.string().trim().min(1).max(600)
});

export const orderEmailSettingsSchema = z.object({
  templates: z.object({
    order_received: editableTemplateSchema,
    order_shipped: editableTemplateSchema,
    order_delivered: editableTemplateSchema
  }),
  review: z.object({
    enabled: z.boolean(),
    url: z.string().trim().max(500).refine((value) => !value || /^https:\/\//.test(value), "Odkaz musí začínat https://"),
    headingCs: z.string().trim().min(1).max(140),
    textCs: z.string().trim().min(1).max(800),
    buttonCs: z.string().trim().min(1).max(80),
    headingSk: z.string().trim().min(1).max(140),
    textSk: z.string().trim().min(1).max(800),
    buttonSk: z.string().trim().min(1).max(80)
  })
});

export type OrderEmailSettings = z.infer<typeof orderEmailSettingsSchema>;

export const defaultOrderEmailSettings: OrderEmailSettings = {
  templates: {
    order_received: {
      subjectCs: "Objednávku jsme přijali",
      statusCs: "Objednávka přijata",
      introCs: "Děkujeme za vaši objednávku. Níže najdete její potvrzený souhrn.",
      subjectSk: "Objednávku sme prijali",
      statusSk: "Objednávka prijatá",
      introSk: "Ďakujeme za vašu objednávku. Nižšie nájdete jej potvrdený súhrn."
    },
    order_shipped: {
      subjectCs: "Zásilka byla předána dopravci",
      statusCs: "Předáno dopravci",
      introCs: "Zásilku jsme předali Zásilkovně. Její cestu můžete sledovat přes odkaz níže.",
      subjectSk: "Zásielka bola odovzdaná dopravcovi",
      statusSk: "Odovzdané dopravcovi",
      introSk: "Zásielku sme odovzdali dopravcovi Packeta. Jej cestu môžete sledovať cez odkaz nižšie."
    },
    order_delivered: {
      subjectCs: "Objednávka byla doručena",
      statusCs: "Doručeno",
      introCs: "Vaše objednávka byla úspěšně doručena. Věříme, že vám šperk AMARÉE udělá radost.",
      subjectSk: "Objednávka bola doručená",
      statusSk: "Doručené",
      introSk: "Vaša objednávka bola úspešne doručená. Veríme, že vám šperk AMARÉE urobí radosť."
    }
  },
  review: {
    enabled: false,
    url: "",
    headingCs: "Podělte se o svou zkušenost",
    textCs: "Budeme rádi za vaše hodnocení. Pomůže nám dál zdokonalovat AMARÉE a ostatním zákazníkům usnadní výběr šperku.",
    buttonCs: "Ohodnotit AMARÉE",
    headingSk: "Podeľte sa o svoju skúsenosť",
    textSk: "Budeme radi za vaše hodnotenie. Pomôže nám ďalej zdokonaľovať AMARÉE a ostatným zákazníkom uľahčí výber šperku.",
    buttonSk: "Ohodnotiť AMARÉE"
  }
};

export async function getOrderEmailSettings(): Promise<OrderEmailSettings> {
  if (process.env.NODE_ENV === "test" || !isSupabaseConfigured()) return defaultOrderEmailSettings;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("integration_settings").select("value").eq("key", "order_email_templates").maybeSingle();
  if (error || !data?.value) return defaultOrderEmailSettings;
  const parsed = orderEmailSettingsSchema.safeParse(data.value);
  return parsed.success ? parsed.data : defaultOrderEmailSettings;
}

export async function saveOrderEmailSettings(value: OrderEmailSettings, updatedBy: string | null) {
  const parsed = orderEmailSettingsSchema.parse(value);
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("integration_settings").upsert({
    key: "order_email_templates",
    value: parsed,
    updated_by: updatedBy,
    description: "Editable order e-mail copy and optional Google review request. Layout remains code-managed."
  });
  if (error) throw new Error(error.message);
}
