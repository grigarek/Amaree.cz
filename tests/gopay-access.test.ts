import { afterEach, describe, expect, it } from "vitest";
import { isGoPayCheckoutAvailable, readGoPayTestCookie } from "@/lib/payments/gopay-access";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("GoPay checkout access", () => {
  it("keeps sandbox checkout hidden without the private test cookie", () => {
    process.env.GOPAY_CHECKOUT_ENABLED = "true";
    process.env.GOPAY_ENVIRONMENT = "sandbox";
    process.env.GOPAY_TEST_ACCESS_TOKEN = "private-token";
    expect(isGoPayCheckoutAvailable()).toBe(false);
    expect(isGoPayCheckoutAvailable("wrong-token")).toBe(false);
    expect(isGoPayCheckoutAvailable("private-token")).toBe(true);
  });

  it("allows an enabled production checkout without a test cookie", () => {
    process.env.GOPAY_CHECKOUT_ENABLED = "true";
    process.env.GOPAY_ENVIRONMENT = "production";
    expect(isGoPayCheckoutAvailable()).toBe(true);
  });

  it("reads only the dedicated test cookie", () => {
    expect(readGoPayTestCookie("session=abc; amaree_gopay_test=secret%2Dvalue; other=1")).toBe("secret-value");
  });
});
