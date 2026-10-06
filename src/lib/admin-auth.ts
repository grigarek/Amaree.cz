import "server-only";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";

export async function requireAdmin() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function requireOrderAdmin() {
  const admin = await requireAdmin();
  if (admin.role !== "admin") redirect("/admin/products");
  return admin;
}
