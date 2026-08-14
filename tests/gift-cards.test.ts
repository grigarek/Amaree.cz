import { describe, expect, it } from "vitest";
import { giftCardDesigns } from "@/lib/gift-cards";

describe("gift-card design order", () => {
  it("keeps a red design on the left and a white design on the right of every row", () => {
    expect(giftCardDesigns).toHaveLength(10);
    giftCardDesigns.forEach((design, index) => {
      expect(design.color).toBe(index % 2 === 0 ? "red" : "white");
    });
  });
});
