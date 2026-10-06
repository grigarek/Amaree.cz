import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  confirmation: z.string().trim().min(1).max(64)
});

const errorMessages: Record<string, { message: string; status: number }> = {
  order_not_found: { message: "Objednávka nebyla nalezena.", status: 404 },
  order_confirmation_mismatch: { message: "Opsané číslo objednávky nesouhlasí.", status: 422 },
  order_must_be_cancelled: { message: "Před smazáním změňte stav objednávky na Zrušeno.", status: 409 },
  order_has_payment_record: { message: "Objednávku nelze smazat, protože už byla spojena s platbou.", status: 409 },
  order_has_stock_movement: { message: "Objednávku nelze smazat, protože už ovlivnila sklad.", status: 409 },
  order_has_shipment: { message: "Objednávku nelze smazat, protože už má vytvořenou zásilku.", status: 409 },
  order_has_complaint: { message: "Objednávku nelze smazat, protože je spojena s reklamací.", status: 409 }
};

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Tuto akci může provést pouze administrátor." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Pro potvrzení opište číslo objednávky." }, { status: 422 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_delete_order", {
    p_order_id: id,
    p_confirmation: parsed.data.confirmation
  });

  if (error) {
    const mapped = Object.entries(errorMessages).find(([key]) => error.message.includes(key))?.[1];
    return NextResponse.json(
      { error: mapped?.message ?? "Objednávku se nepodařilo bezpečně smazat." },
      { status: mapped?.status ?? 500 }
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  return NextResponse.json({ ok: true, orderNumber: data });
}
