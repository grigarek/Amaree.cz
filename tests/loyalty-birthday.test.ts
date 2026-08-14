import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isValidBirthday } from "@/lib/loyalty/birthday";

describe("loyalty birthday", () => {
  it("accepts valid calendar dates including 29 February", () => {
    expect(isValidBirthday(1, 1)).toBe(true);
    expect(isValidBirthday(2, 29)).toBe(true);
    expect(isValidBirthday(12, 31)).toBe(true);
  });

  it("rejects impossible or incomplete dates", () => {
    expect(isValidBirthday(2, 30)).toBe(false);
    expect(isValidBirthday(4, 31)).toBe(false);
    expect(isValidBirthday(0, 10)).toBe(false);
    expect(isValidBirthday(13, 1)).toBe(false);
    expect(isValidBirthday(6, 0)).toBe(false);
  });

  it("issues birthday rewards only on the birthday itself", () => {
    const migration = readFileSync(
      "supabase/migrations/202608100001_loyalty_birthday_on_date.sql",
      "utf8"
    );

    expect(migration).toContain("birthday_issue_days_before set default 0");
    expect(migration).toContain("if current_date <> birthday_date then");
    expect(migration).not.toContain("birthday_date - make_interval");
  });
});
