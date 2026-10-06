import { describe, expect, it } from "vitest";
import { canManageOrders, isLocalAdminAccessAllowed } from "@/lib/admin/access-policy";

describe("admin access policy", () => {
  it("fails closed when Supabase is unavailable outside local development", () => {
    expect(isLocalAdminAccessAllowed("staging", "true")).toBe(false);
    expect(isLocalAdminAccessAllowed("production", "true")).toBe(false);
    expect(isLocalAdminAccessAllowed("development", undefined)).toBe(false);
  });

  it("allows the explicit local development escape hatch only", () => {
    expect(isLocalAdminAccessAllowed("development", "true")).toBe(true);
  });

  it("keeps order and integration actions restricted to admins", () => {
    expect(canManageOrders("admin")).toBe(true);
    expect(canManageOrders("editor")).toBe(false);
  });
});
