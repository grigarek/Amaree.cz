import { NextResponse } from "next/server";
import { discountValidationSchema } from "@/lib/discounts/schema";
import { validateDiscountCode } from "@/lib/discounts/validate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 }); }
  const parsed = discountValidationSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Zadejte slevový kód a zkontrolujte košík." }, { status: 422 });
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await validateDiscountCode(parsed.data.code, parsed.data.currency, parsed.data.lines, parsed.data.locale, user?.id);
    return NextResponse.json(result, { status: result.valid ? 200 : 422 });
  } catch {
    return NextResponse.json({ error: "Slevový kód nyní nelze ověřit. Zkuste to prosím znovu." }, { status: 503 });
  }
}
