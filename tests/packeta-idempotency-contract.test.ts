import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Packeta shipment idempotency", () => {
  it("locks shipment creation per order, not per customer or product", () => {
    const migration = readFileSync(
      "supabase/migrations/202608090002_order_notifications_and_packeta_automation.sql",
      "utf8"
    );
    expect(migration).toContain("where id = p_order_id for update");
    expect(migration).toContain("on conflict (order_id, provider) do nothing");
    expect(migration).toContain("where order_id = p_order_id and provider = 'packeta'");
  });
});
