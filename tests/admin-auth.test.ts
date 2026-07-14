import { describe, expect, it } from "vitest";

function canAccessAdmin(email: string | undefined, allowed: string) {
  return Boolean(email && allowed.split(",").map((item) => item.trim().toLowerCase()).includes(email.toLowerCase()));
}

describe("admin access", () => {
  it("denies unknown users", () => {
    expect(canAccessAdmin("someone@example.com", "info@amaree.cz")).toBe(false);
  });

  it("allows configured administrators", () => {
    expect(canAccessAdmin("info@amaree.cz", "info@amaree.cz")).toBe(true);
  });
});
