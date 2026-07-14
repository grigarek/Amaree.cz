import { describe, expect, it } from "vitest";
import { WebhookIdempotencyStore } from "@/lib/webhook-idempotency";

describe("webhook idempotency", () => {
  it("ignores repeated webhook event IDs", () => {
    const store = new WebhookIdempotencyStore();
    expect(store.process("evt_1")).toBe("new");
    expect(store.process("evt_1")).toBe("duplicate");
  });
});
