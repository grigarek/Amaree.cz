import { describe, expect, it } from "vitest";
import { customerGreeting } from "@/lib/email/salutation";

describe("customer e-mail salutation", () => {
  it("uses Czech vocative for a known male name", () => {
    expect(customerGreeting("cs", "David")).toBe("Dobrý den Davide,");
  });

  it("uses Czech vocative for a common female name", () => {
    expect(customerGreeting("cs", "Aneta")).toBe("Dobrý den Aneto,");
  });

  it("does not guess unsupported Slovak inflection", () => {
    expect(customerGreeting("sk", "David")).toBe("Dobrý deň David,");
  });
});
