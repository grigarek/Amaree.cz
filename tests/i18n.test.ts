import { describe, expect, it } from "vitest";
import { getAlternatePath, getLocalizedAlternates } from "@/i18n/routing";

describe("language switcher", () => {
  it("maps paused foreign-language routes back to Czech", () => {
    expect(getAlternatePath("cs", "/en/contact")).toBe("/cs/kontakt");
    expect(getAlternatePath("cs", "/de/kollektion/ohrringe")).toBe("/cs/sperky/nausnice");
  });

  it("preserves an unknown product slug for server-side localized resolution", () => {
    expect(getAlternatePath("en", "/cs/produkt/luna-nausnice")).toBe("/en/product/luna-nausnice");
  });

  it("localizes the collection category slug when switching language", () => {
    expect(getAlternatePath("de", "/cs/sperky/nausnice")).toBe("/de/kollektion/ohrringe");
  });

  it("builds valid alternate links for localized collection routes", () => {
    expect(getLocalizedAlternates("/cs/sperky/nausnice")).toEqual({
      cs: "/cs/sperky/nausnice",
      sk: "/sk/sperky/nausnice",
      en: "/en/collection/earrings",
      de: "/de/kollektion/ohrringe"
    });
  });

  it("maps the former Czech collection URL to the current jewelry URL", () => {
    expect(getAlternatePath("cs", "/cs/kolekce/nausnice")).toBe("/cs/sperky/nausnice");
  });

  it("maps AMARÉE Club to its localized public conditions page", () => {
    expect(getLocalizedAlternates("/cs/amaree-club")).toEqual({
      cs: "/cs/amaree-club",
      sk: "/sk/amaree-club",
      en: "/en/amaree-club",
      de: "/de/amaree-club"
    });
  });
});
