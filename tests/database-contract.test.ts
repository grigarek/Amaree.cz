import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202607170001_development_baseline.sql", "utf8");

describe("development database baseline", () => {
  it("creates checkout and reserves stock in one service-role function", () => {
    expect(migration).toContain("create function public.create_checkout_order");
    expect(migration).toContain("perform public.reserve_order_stock(target_order_id, expires_at_value)");
    expect(migration).toContain("idempotency_key uuid not null unique");
  });

  it("persists idempotent payment webhook events and status history", () => {
    expect(migration).toContain("create function public.process_gopay_payment_status");
    expect(migration).toContain("unique (provider, event_id)");
    expect(migration).toContain("insert into public.payment_status_history");
  });

  it("claims a Packeta shipment once per order", () => {
    expect(migration).toContain("create function public.admin_claim_packeta_shipment");
    expect(migration).toContain("unique (order_id, provider)");
    expect(migration).toContain("shipment_row.status = 'creating'");
  });

  it("requires a complete product before activation and audits admin changes", () => {
    expect(migration).toContain("create function public.admin_set_product_active");
    expect(migration).toContain("product_primary_image_incomplete");
    expect(migration).toContain("create trigger audit_products");
  });

  it("keeps inactive products private and order data admin-only", () => {
    expect(migration).toContain("public_products_read on public.products for select using (active and archived_at is null)");
    expect(migration).toContain("admins_manage_orders on public.orders for all using (public.is_admin_user(array['admin'::public.admin_role]))");
  });

  it("deduplicates transactional e-mail records", () => {
    expect(migration).toContain("dedupe_key text not null unique");
    expect(migration).toContain("create table public.email_messages");
    expect(migration).toContain("body_text text not null");
    expect(migration).toContain("body_html text not null");
  });

  it("keeps reservation expiry and free-tier usage checks service-role only", () => {
    expect(migration).toContain("create function public.expire_due_stock_reservations");
    expect(migration).toContain("create function public.get_project_usage");
    expect(migration).toContain("revoke all on function public.get_project_usage() from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.get_project_usage() to service_role");
  });
});
