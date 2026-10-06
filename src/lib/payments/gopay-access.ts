import { timingSafeEqual } from "node:crypto";

export const GOPAY_TEST_COOKIE = "amaree_gopay_test";

export function isGoPayCheckoutAvailable(testCookie?: string) {
  if (process.env.NODE_ENV === "development") return true;
  if (process.env.GOPAY_CHECKOUT_ENABLED !== "true") return false;
  if (process.env.GOPAY_ENVIRONMENT !== "sandbox") return true;
  return isValidGoPayTestToken(testCookie);
}

export function isValidGoPayTestToken(candidate?: string | null) {
  const expected = process.env.GOPAY_TEST_ACCESS_TOKEN;
  if (!expected || !candidate) return false;
  const expectedBuffer = Buffer.from(expected);
  const candidateBuffer = Buffer.from(candidate);
  return expectedBuffer.length === candidateBuffer.length && timingSafeEqual(expectedBuffer, candidateBuffer);
}

export function readGoPayTestCookie(cookieHeader: string | null) {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === GOPAY_TEST_COOKIE) return decodeURIComponent(value.join("="));
  }
  return undefined;
}
