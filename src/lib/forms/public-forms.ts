import { z } from "zod";

const localeSchema = z.enum(["cs", "sk", "en", "de"]);

export const newsletterSignupSchema = z.object({
  email: z.string().trim().email().max(254),
  locale: localeSchema,
  consent: z.literal(true),
  company: z.string().max(0),
  startedAt: z.number().int().positive()
});

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  orderNumber: z.string().trim().max(40).optional().default(""),
  message: z.string().trim().min(10).max(5000),
  locale: localeSchema,
  consent: z.literal(true),
  company: z.string().max(0),
  startedAt: z.number().int().positive()
});

export function isPlausibleHumanSubmission(startedAt: number, now = Date.now()) {
  const elapsed = now - startedAt;
  return elapsed >= 1_200 && elapsed <= 24 * 60 * 60 * 1000;
}
