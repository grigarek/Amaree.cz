import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isLocale, localizedPaths } from "@/i18n/routing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.string().trim().email(), locale: z.string() });

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const parsed = schema.safeParse({ email: form.get("email"), locale: form.get("locale") });
  const locale = parsed.success && isLocale(parsed.data.locale) ? parsed.data.locale : "cs";
  if (!parsed.success) return NextResponse.redirect(new URL(`${localizedPaths[locale].login}?error=email`, request.url), 303);
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.url).origin;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/customer/callback?next=${encodeURIComponent(localizedPaths[locale].account)}`,
      data: { locale }
    }
  });
  const target = error ? `${localizedPaths[locale].login}?error=send` : `${localizedPaths[locale].login}?sent=1`;
  return NextResponse.redirect(new URL(target, request.url), 303);
}
