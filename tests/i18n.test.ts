import { describe, expect, it } from "vitest";
import { getAlternatePath } from "@/i18n/routing";

describe("language switcher", () => {
  it("keeps product slug when switching language", () => {
    expect(getAlternatePath("en", "/cs/produkt/luna-nausnice")).toBe("/en/product/luna-nausnice");
  });

  it("localizes the collection category slug when switching language", () => {
    expect(getAlternatePath("de", "/cs/kolekce/nausnice")).toBe("/de/kollektion/ohrringe");
  });
});
