import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202607170001_development_baseline.sql", "utf8");
const operationalMigration = readFileSync("supabase/migrations/202607190001_email_and_packeta_settings.sql", "utf8");
const productWorkflowMigration = readFileSync("supabase/migrations/202607200001_product_admin_workflow.sql", "utf8");
const productAiMigration = readFileSync("supabase/migrations/202607200002_product_ai_assistant.sql", "utf8");
const hallmarkMigration = readFileSync("supabase/migrations/202607210001_hallmark_compliance.sql", "utf8");
const orderTermsMigration = readFileSync("supabase/migrations/202607210002_order_terms_snapshot.sql", "utf8");
const discountAdminMigration = readFileSync("supabase/migrations/202607220001_discount_code_admin.sql", "utf8");
const orderEmailMigration = readFileSync("supabase/migrations/202607290001_order_numbers_email_templates.sql", "utf8");
const orderDeleteMigration = readFileSync("supabase/migrations/202608010003_admin_delete_order.sql", "utf8");
const maintenanceMigration = readFileSync("supabase/migrations/202608020001_storefront_maintenance.sql", "utf8");
const fakturoidMigration = readFileSync("supabase/migrations/202608030001_fakturoid_integration.sql", "utf8");
const productNamesMigration = readFileSync("supabase/migrations/202608090003_unique_product_names.sql", "utf8");

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

  it("stores confirmed Slovak fees and disables unverified COD services", () => {
    expect(operationalMigration).toContain("set price_minor = 850, free_from_minor = null");
    expect(operationalMigration).toContain("set fee_minor = 150");
    expect(operationalMigration).toContain('\"SK\": {\"pickup\": false, \"zbox\": false, \"home\": false}');
  });

  it("adds provider-independent e-mail metadata and protected settings", () => {
    expect(operationalMigration).toContain("alter column provider set default 'resend'");
    expect(operationalMigration).toContain("create table if not exists public.integration_settings");
    expect(operationalMigration).toContain("admins_manage_integration_settings");
    expect(operationalMigration).toContain('\"dailyWarningLimit\": 80');
    expect(operationalMigration).toContain('\"monthlyWarningLimit\": 2400');
  });

  it("generates immutable product IDs and exposes the four-state publication workflow", () => {
    expect(productWorkflowMigration).toContain("alter column internal_id set default (gen_random_uuid()::text)");
    expect(productWorkflowMigration).toContain("product_publication_status as enum ('draft', 'active', 'hidden', 'archived')");
    expect(productWorkflowMigration).toContain("create or replace function public.admin_product_publish_issues");
    expect(productWorkflowMigration).toContain("create or replace function public.admin_set_product_status");
    expect(productWorkflowMigration).toContain("publication_status = 'active'");
  });

  it("rate-limits AI requests and stores only minimal operational metadata", () => {
    expect(productAiMigration).toContain("create table if not exists public.product_ai_requests");
    expect(productAiMigration).toContain("created_at >= now() - interval '15 minutes'");
    expect(productAiMigration).toContain(") >= 5 then");
    expect(productAiMigration).toContain("created_at >= now() - interval '24 hours'");
    expect(productAiMigration).toContain(") >= 30 then");
    expect(productAiMigration).not.toContain("generated_content");
    expect(productAiMigration).not.toContain("image_data");
    expect(productAiMigration).toContain("p_applied_fields");
  });

  it("keeps hallmark claims manually verified and hidden until publication is complete", () => {
    expect(hallmarkMigration).toContain("create table if not exists public.hallmark_settings");
    expect(hallmarkMigration).toContain("create table if not exists public.product_material_compliance");
    expect(hallmarkMigration).toContain("details_verified boolean not null default false");
    expect(hallmarkMigration).toContain("public_page_enabled");
    expect(hallmarkMigration).toContain("footer_link_enabled");
  });

  it("stores the exact terms accepted with each order", () => {
    expect(orderTermsMigration).toContain("terms_accepted_at timestamptz");
    expect(orderTermsMigration).toContain("terms_version text");
    expect(orderTermsMigration).toContain("terms_snapshot jsonb");
    expect(orderTermsMigration).toContain("orders_terms_acceptance_complete");
  });

  it("adds administrator metadata and strict constraints to discount codes", () => {
    expect(discountAdminMigration).toContain("internal_name text not null");
    expect(discountAdminMigration).toContain("discount_codes_percent_range");
    expect(discountAdminMigration).toContain("discount_codes_validity_order");
    expect(discountAdminMigration).toContain("discount_codes_actor");
  });

  it("uses short numbers for new orders and stores editable e-mail copy", () => {
    expect(migration).toContain("'A' || to_char(now(), 'YY') || '-' || lpad(nextval('public.order_number_sequence')::text, 4, '0')");
    expect(orderEmailMigration).toContain("create trigger orders_short_order_number");
    expect(orderEmailMigration).toContain("create trigger payments_bank_transfer_variable_symbol");
    expect(orderEmailMigration).toContain("'order_email_templates'");
  });

  it("allows only guarded deletion of cancelled test orders", () => {
    expect(orderDeleteMigration).toContain("create or replace function public.admin_delete_order");
    expect(orderDeleteMigration).toContain("order_confirmation_mismatch");
    expect(orderDeleteMigration).toContain("order_must_be_cancelled");
    expect(orderDeleteMigration).toContain("order_has_payment_record");
    expect(orderDeleteMigration).toContain("order_has_stock_movement");
    expect(orderDeleteMigration).toContain("order_has_shipment");
    expect(orderDeleteMigration).toContain("order_has_complaint");
    expect(orderDeleteMigration).toContain("grant execute on function public.admin_delete_order(uuid, text) to authenticated");
  });

  it("seeds maintenance mode in the protected integration settings table", () => {
    expect(maintenanceMigration).toContain("'storefront_maintenance'");
    expect(maintenanceMigration).toContain('"enabled": false');
    expect(maintenanceMigration).toContain("on conflict (key) do nothing");
  });

  it("stores one idempotent Fakturoid document per order and starts disabled", () => {
    expect(fakturoidMigration).toContain("create table if not exists public.accounting_documents");
    expect(fakturoidMigration).toContain("unique (order_id, provider)");
    expect(fakturoidMigration).toContain("unique (provider, remote_document_id)");
    expect(fakturoidMigration).toContain("admins_manage_accounting_documents");
    expect(fakturoidMigration).toContain('"enabled": false');
    expect(fakturoidMigration).toContain('"automaticTrigger": "delivered"');
  });

  it("preserves old product URLs while publishing original AMARÉE names", () => {
    expect(productNamesMigration).toContain("create table if not exists public.product_slug_aliases");
    expect(productNamesMigration).toContain("primary key (locale, slug)");
    expect(productNamesMigration).toContain("public_product_slug_aliases_read");
    expect(productNamesMigration).toContain("AMARÉE Rosé náramek");
    expect(productNamesMigration).toContain("AMARÉE Noir náhrdelník");
    expect(productNamesMigration).toContain("AMARÉE Halo stříbrný náramek");
  });
});
