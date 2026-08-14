import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DiscountCodeInput } from "@/lib/discounts/schema";
import { discountDateBoundaryIso, toPragueDateInput } from "@/lib/discounts/dates";

type DiscountRow = {
  id: string;
  internal_name: string;
  code: string;
  discount_type: "percent" | "fixed" | "free_shipping";
  value: number;
  currency: "CZK" | "EUR" | null;
  minimum_order_minor: number;
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  usage_limit: number | null;
  usage_count: number;
  source: "admin" | "loyalty" | "birthday";
  created_at: string;
  updated_at: string;
};

const select = "id,internal_name,code,discount_type,value,currency,minimum_order_minor,active,valid_from,valid_to,usage_limit,usage_count,source,created_at,updated_at";

export type AdminDiscount = DiscountCodeInput & {
  id: string;
  usageCount: number;
  source: "admin" | "loyalty" | "birthday";
  createdAt: string;
  updatedAt: string;
};

function fromRow(row: DiscountRow): AdminDiscount {
  return {
    id: row.id,
    internalName: row.internal_name,
    code: row.code,
    discountType: row.discount_type,
    value: row.discount_type === "fixed" ? row.value / 100 : row.discount_type === "free_shipping" ? 0 : row.value,
    currency: row.currency,
    minimumOrderValue: row.minimum_order_minor / 100,
    usageLimit: row.usage_limit,
    usageCount: row.usage_count,
    active: row.active,
    validFrom: toPragueDateInput(row.valid_from),
    validTo: toPragueDateInput(row.valid_to),
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toRow(input: DiscountCodeInput) {
  return {
    internal_name: input.internalName,
    code: input.code,
    discount_type: input.discountType,
    value: input.discountType === "fixed" ? Math.round(input.value * 100) : input.discountType === "free_shipping" ? 1 : input.value,
    currency: input.discountType === "free_shipping" ? null : input.currency,
    minimum_order_minor: Math.round(input.minimumOrderValue * 100),
    usage_limit: input.usageLimit,
    active: input.active,
    valid_from: input.validFrom ? discountDateBoundaryIso(input.validFrom, "start") : null,
    valid_to: input.validTo ? discountDateBoundaryIso(input.validTo, "end") : null
  };
}

export async function listAdminDiscounts(): Promise<AdminDiscount[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("discount_codes").select(select).order("active", { ascending: false }).order("updated_at", { ascending: false });
  if (error) throw new Error(`Slevové kódy se nepodařilo načíst: ${error.message}`);
  return ((data ?? []) as DiscountRow[]).map(fromRow);
}

export async function getAdminDiscount(id: string): Promise<AdminDiscount | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("discount_codes").select(select).eq("id", id).maybeSingle();
  if (error) throw new Error(`Slevový kód se nepodařilo načíst: ${error.message}`);
  return data ? fromRow(data as DiscountRow) : null;
}

export async function saveAdminDiscount(input: DiscountCodeInput, id?: string) {
  const supabase = await createSupabaseServerClient();
  const row = toRow(input);
  const query = id
    ? supabase.from("discount_codes").update(row).eq("id", id).select("id").single()
    : supabase.from("discount_codes").insert(row).select("id").single();
  const { data, error } = await query;
  if (error?.code === "23505") throw new Error("Tento slevový kód již existuje.");
  if (error) throw new Error(`Slevový kód se nepodařilo uložit: ${error.message}`);
  return data.id as string;
}

export async function setAdminDiscountActive(id: string, active: boolean) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("discount_codes").update({ active }).eq("id", id);
  if (error) throw new Error(`Stav slevového kódu se nepodařilo změnit: ${error.message}`);
}

export async function deleteAdminDiscount(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error: lookupError } = await supabase.from("discount_codes").select("usage_count,source").eq("id", id).maybeSingle();
  if (lookupError) throw new Error(`Slevový kód se nepodařilo načíst: ${lookupError.message}`);
  if (!data) throw new Error("Slevový kód již neexistuje.");
  if (data.source !== "admin") throw new Error("Automatickou klubovou odměnu nelze ručně smazat.");
  if (data.usage_count > 0) throw new Error("Použitý slevový kód nelze smazat kvůli historii objednávek. Můžete jej vypnout.");
  const { error } = await supabase.from("discount_codes").delete().eq("id", id);
  if (error) throw new Error(`Slevový kód se nepodařilo smazat: ${error.message}`);
}
