"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

async function recordLogin(email: string, success: boolean, reason: string, userId?: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const requestHeaders = await headers();
    const fingerprintSource = `${requestHeaders.get("user-agent") ?? "unknown"}|${requestHeaders.get("x-forwarded-for") ?? "unknown"}`;
    const fingerprint = createHash("sha256").update(fingerprintSource).digest("hex");
    await createSupabaseAdminClient().from("admin_login_events").insert({
      user_id: userId ?? null,
      email,
      success,
      reason,
      request_fingerprint: fingerprint
    });
  } catch {
    // Login must not fail only because security-event logging is temporarily unavailable.
  }
}

export async function loginAdmin(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/admin/login?error=not-configured");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/admin/login?error=invalid");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    await recordLogin(email, false, "invalid_credentials");
    redirect("/admin/login?error=invalid");
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id,active")
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();
  if (!admin) {
    await recordLogin(email, false, "not_approved", data.user.id);
    await supabase.auth.signOut();
    redirect("/admin/login?error=denied");
  }

  await recordLogin(email, true, "authenticated", data.user.id);
  redirect("/admin");
}

export async function logoutAdmin() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
