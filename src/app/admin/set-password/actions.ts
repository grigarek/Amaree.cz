"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function setAdminPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");

  if (password.length < 12) redirect("/admin/set-password?error=length");
  if (password !== confirmation) redirect("/admin/set-password?error=mismatch");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (!admin) redirect("/admin/login?error=denied");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/admin/set-password?error=update");
  redirect("/admin");
}
