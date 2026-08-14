import { describe, expect, it } from "vitest";
import { discountDateBoundaryIso, isDateOnly, toPragueDateInput } from "@/lib/discounts/dates";

describe("discount validity dates", () => {
  it("accepts real calendar dates only", () => {
    expect(isDateOnly("2026-08-11")).toBe(true);
    expect(isDateOnly("2026-02-30")).toBe(false);
    expect(isDateOnly("2026-08-11T12:00")).toBe(false);
  });

  it("covers the full selected day in Prague summer time", () => {
    expect(discountDateBoundaryIso("2026-08-11", "start")).toBe("2026-08-10T22:00:00.000Z");
    expect(discountDateBoundaryIso("2026-08-11", "end")).toBe("2026-08-11T21:59:59.999Z");
  });

  it("converts stored timestamps back to a date-only admin value", () => {
    expect(toPragueDateInput("2026-08-11T21:59:59.999Z")).toBe("2026-08-11");
  });
});
