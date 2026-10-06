import { describe, expect, it } from "vitest";
import { buildLoyaltyRewardEmail } from "@/lib/email/loyalty-reward";

const baseInput = {
  code: "AMAREE-CLUB-TEST",
  currency: "CZK" as const,
  expiresAt: "2026-12-31T23:59:59.000Z",
  firstName: "David",
  locale: "cs" as const,
  minimumOrderMinor: 120000,
  rewardPercent: 10,
  rewardType: "threshold" as const,
  siteUrl: "https://amaree.cz"
};

describe("AMARÉE Club reward email", () => {
  it("announces a newly earned reward with its code and account link", () => {
    const email = buildLoyaltyRewardEmail(baseInput);

    expect(email.subject).toContain("Získali jste odměnu 10 %");
    expect(email.text).toContain("AMAREE-CLUB-TEST");
    expect(email.text.replaceAll("\u00a0", " ")).toContain("1 200 Kč");
    expect(email.html).toContain("https://amaree.cz/cs/muj-ucet");
  });

  it("uses a dedicated birthday message", () => {
    const email = buildLoyaltyRewardEmail({ ...baseInput, rewardType: "birthday" });

    expect(email.subject).toContain("Narozeninová odměna");
    expect(email.text).toContain("krásné narozeniny");
  });
});
