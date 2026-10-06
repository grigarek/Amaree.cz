import { afterEach, describe, expect, it } from "vitest";
import { isIndexingAllowed } from "@/lib/environment";

const originalAppEnvironment = process.env.APP_ENV;
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  process.env.APP_ENV = originalAppEnvironment;
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

describe("staging indexing policy", () => {
  it("never allows indexing on the staging host", () => {
    process.env.APP_ENV = "staging";
    process.env.NEXT_PUBLIC_SITE_URL = "https://test.amaree.cz";
    expect(isIndexingAllowed()).toBe(false);
  });

  it("allows indexing only on the production AMARÉE host", () => {
    process.env.APP_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://amaree.cz";
    expect(isIndexingAllowed()).toBe(true);
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example.test";
    expect(isIndexingAllowed()).toBe(false);
  });
});
