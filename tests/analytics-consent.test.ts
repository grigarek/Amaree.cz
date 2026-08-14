import { describe, expect, it } from "vitest";
import { isInternalVisitor, isInternalVisitorValue } from "@/lib/analytics/consent";

describe("analytics preferences", () => {
  it("recognizes the stored internal-browser marker", () => {
    expect(isInternalVisitorValue("1")).toBe(true);
    expect(isInternalVisitorValue("0")).toBe(false);
    expect(isInternalVisitorValue(null)).toBe(false);
  });

  it("keeps server rendering and ordinary visitors included by default", () => {
    expect(isInternalVisitor()).toBe(false);
  });
});
