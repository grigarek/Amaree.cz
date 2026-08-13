import { describe, expect, it } from "vitest";
import { defaultMaintenanceSettings, formatPragueDateTimeLocal, getCountdownParts, getMaintenanceLocale, isApiPath, isLocalDevelopmentHostname, isMaintenanceExemptPath, parseMaintenanceSettings, pragueDateTimeLocalToIso } from "@/lib/maintenance";

describe("maintenance mode", () => {
  it("keeps API routes outside locale routing", () => {
    expect(isApiPath("/api/checkout")).toBe(true);
    expect(isApiPath("/api")).toBe(true);
    expect(isApiPath("/cs/api/checkout")).toBe(false);
  });

  it("is disabled by default and safely parses incomplete stored values", () => {
    expect(defaultMaintenanceSettings.enabled).toBe(false);
    expect(defaultMaintenanceSettings.countdownEnabled).toBe(false);
    expect(parseMaintenanceSettings({ enabled: true, headline: { cs: "Údržba" } })).toMatchObject({
      enabled: true,
      headline: { cs: "Údržba", sk: defaultMaintenanceSettings.headline.sk }
    });
  });

  it("calculates a launch countdown and stops at zero", () => {
    expect(getCountdownParts("2026-08-05T12:00:00.000Z", Date.parse("2026-08-03T09:57:55.000Z"))).toEqual({
      days: 2,
      hours: 2,
      minutes: 2,
      seconds: 5,
      complete: false
    });
    expect(getCountdownParts("2026-08-03T09:00:00.000Z", Date.parse("2026-08-03T10:00:00.000Z"))).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      complete: true
    });
  });

  it("keeps administration and operational callbacks available", () => {
    expect(isMaintenanceExemptPath("/admin/settings/maintenance")).toBe(true);
    expect(isMaintenanceExemptPath("/api/webhooks/gopay")).toBe(true);
    expect(isMaintenanceExemptPath("/api/payments/gopay/notification")).toBe(true);
    expect(isMaintenanceExemptPath("/api/cron/packeta-status")).toBe(true);
    expect(isMaintenanceExemptPath("/cs/objednavka/dekujeme")).toBe(true);
    expect(isMaintenanceExemptPath("/cs/sperky")).toBe(false);
    expect(isMaintenanceExemptPath("/api/checkout")).toBe(false);
  });

  it("keeps local development outside maintenance mode", () => {
    expect(isLocalDevelopmentHostname("localhost")).toBe(true);
    expect(isLocalDevelopmentHostname("127.0.0.1")).toBe(true);
    expect(isLocalDevelopmentHostname("[::1]")).toBe(true);
    expect(isLocalDevelopmentHostname("amaree.cz")).toBe(false);
  });

  it("uses the requested storefront language", () => {
    expect(getMaintenanceLocale("/sk/sperky")).toBe("sk");
    expect(getMaintenanceLocale("/cs/sperky")).toBe("cs");
  });

  it("stores the expected return in Prague time across daylight saving changes", () => {
    expect(pragueDateTimeLocalToIso("2026-08-02T18:30")).toBe("2026-08-02T16:30:00.000Z");
    expect(pragueDateTimeLocalToIso("2026-12-02T18:30")).toBe("2026-12-02T17:30:00.000Z");
    expect(formatPragueDateTimeLocal("2026-08-02T16:30:00.000Z")).toBe("2026-08-02T18:30");
  });
});
