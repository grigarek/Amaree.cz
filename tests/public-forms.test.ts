import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeToEcomail } from "@/lib/email/ecomail-newsletter";
import { contactMessageSchema, isPlausibleHumanSubmission, newsletterSignupSchema } from "@/lib/forms/public-forms";

afterEach(() => delete process.env.ECOMAIL_NEWSLETTER_ENABLED);

describe("public forms", () => {
  it("requires explicit consent and rejects bot-fast submissions", () => {
    expect(newsletterSignupSchema.safeParse({ email: "anna@example.cz", locale: "cs", consent: false, company: "", startedAt: 1 }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ name: "Anna Nováková", email: "anna@example.cz", message: "Prosím o informaci.", locale: "cs", consent: true, company: "", startedAt: 1 }).success).toBe(true);
    expect(isPlausibleHumanSubmission(10_000, 10_500)).toBe(false);
    expect(isPlausibleHumanSubmission(10_000, 12_000)).toBe(true);
  });

  it("uses Ecomail double opt-in without exposing the key in the body", async () => {
    process.env.ECOMAIL_NEWSLETTER_ENABLED = "true";
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await subscribeToEcomail({ email: "anna@example.cz", locale: "cs" }, { apiKey: "secret-key", listId: "7", fetcher });
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe("https://api2.ecomailapp.cz/lists/7/subscribe");
    expect(request.headers.key).toBe("secret-key");
    expect(request.body).not.toContain("secret-key");
    expect(JSON.parse(request.body)).toMatchObject({ skip_confirmation: false, update_existing: true, subscriber_data: { tags: ["web-newsletter", "cs"] } });
  });
});
