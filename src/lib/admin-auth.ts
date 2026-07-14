import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function requireAdmin() {
  if (!isSupabaseConfigured()) {
    return {
      email: "local-admin@example.test",
      mode: "development"
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!user?.email || !allowed.includes(user.email.toLowerCase())) {
    redirect("/admin/login");
  }

  return {
    email: user.email,
    mode: "supabase"
  };
}
