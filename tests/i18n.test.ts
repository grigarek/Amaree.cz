import { describe, expect, it } from "vitest";
import { getAlternatePath, getLocalizedAlternates } from "@/i18n/routing";

describe("language switcher", () => {
  it("keeps product slug when switching language", () => {
    expect(getAlternatePath("en", "/cs/produkt/luna-nausnice")).toBe("/en/product/luna-nausnice");
  });

  it("localizes the collection category slug when switching language", () => {
    expect(getAlternatePath("de", "/cs/kolekce/nausnice")).toBe("/de/kollektion/ohrringe");
  });

  it("builds valid alternate links for localized collection routes", () => {
    expect(getLocalizedAlternates("/cs/kolekce/nausnice")).toEqual({
      cs: "/cs/kolekce/nausnice",
      en: "/en/collection/earrings",
      de: "/de/kollektion/ohrringe"
    });
  });
});
