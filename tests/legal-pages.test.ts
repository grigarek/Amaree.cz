import { describe, expect, it } from "vitest";
import { localizedPaths, locales } from "@/i18n/routing";
import { getLegalPageContent, getLegalPageNavigation, type LegalPageKey } from "@/lib/legal-pages";

const pageKeys: LegalPageKey[] = ["terms", "privacy", "returns", "shipping", "care"];

describe("customer care pages", () => {
  it.each(locales)("provides all customer care pages in %s", (locale) => {
    const navigation = getLegalPageNavigation(locale);

    expect(navigation).toHaveLength(pageKeys.length);
    expect(new Set(navigation.map((item) => item.href)).size).toBe(pageKeys.length);

    for (const key of pageKeys) {
      const page = getLegalPageContent(locale, localizedPaths[locale][key]);
      const pageText = JSON.stringify(page);

      expect(page.title.length).toBeGreaterThan(3);
      expect(page.intro.length).toBeGreaterThan(20);
      expect(page.sections.length).toBeGreaterThanOrEqual(5);
      expect(pageText).not.toMatch(/Olivie|Vàng|Shoptet|Stripe/i);
    }
  });
});
