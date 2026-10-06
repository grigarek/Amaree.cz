import { NextResponse } from "next/server";
import { z } from "zod";
import { isLocale } from "@/i18n/routing";
import { isValidBirthday } from "@/lib/loyalty/birthday";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const birthdaySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(31)
});

function accountUrl(request: Request, locale: string, query: string) {
  return new URL(`/${locale}/muj-ucet?${query}`, request.url);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const requestedLocale = String(form.get("locale") ?? "cs");
  const locale = isLocale(requestedLocale) ? requestedLocale : "cs";
  const parsed = birthdaySchema.safeParse({ month: form.get("month"), day: form.get("day") });
  if (!parsed.success) return NextResponse.redirect(accountUrl(request, locale, "birthday_error=invalid"), 303);

  if (!isValidBirthday(parsed.data.month, parsed.data.day)) {
    return NextResponse.redirect(accountUrl(request, locale, "birthday_error=invalid"), 303);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/${locale}/prihlaseni`, request.url), 303);
  const { data, error } = await supabase.rpc("set_customer_birthday", { p_month: parsed.data.month, p_day: parsed.data.day });
  if (error || data !== true) return NextResponse.redirect(accountUrl(request, locale, "birthday_error=locked"), 303);
  return NextResponse.redirect(accountUrl(request, locale, "birthday_saved=1"), 303);
}
