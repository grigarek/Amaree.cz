import "server-only";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAppEnvironment } from "@/lib/environment";
import { isLocalAdminAccessAllowed } from "@/lib/admin/access-policy";

export type AdminSession = {
  userId: string;
  email: string;
  role: "admin" | "editor";
  mode: "supabase" | "local";
};

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!isSupabaseConfigured()) {
    if (isLocalAdminAccessAllowed(getAppEnvironment(), process.env.ALLOW_LOCAL_ADMIN)) {
      return { userId: "local-admin", email: "local-admin@example.test", role: "admin", mode: "local" };
    }
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) return null;

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id,email,role,active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (adminError || !admin || (admin.role !== "admin" && admin.role !== "editor")) return null;

  return {
    userId: user.id,
    email: admin.email,
    role: admin.role,
    mode: "supabase"
  };
}
