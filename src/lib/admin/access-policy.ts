import type { AppEnvironment } from "@/lib/environment";

export function isLocalAdminAccessAllowed(environment: AppEnvironment, flag: string | undefined) {
  return environment === "development" && flag === "true";
}

export function canManageOrders(role: "admin" | "editor") {
  return role === "admin";
}
