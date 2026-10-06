export type MaintenanceLocale = "cs" | "sk";

export type MaintenanceSettings = {
  enabled: boolean;
  countdownEnabled: boolean;
  headline: Record<MaintenanceLocale, string>;
  message: Record<MaintenanceLocale, string>;
  expectedBackAt: string | null;
};

export const defaultMaintenanceSettings: MaintenanceSettings = {
  enabled: false,
  countdownEnabled: false,
  headline: {
    cs: "Právě pro vás něco vylepšujeme",
    sk: "Práve pre vás niečo vylepšujeme"
  },
  message: {
    cs: "E-shop je krátce mimo provoz. Brzy se vrátíme s ještě příjemnějším nákupem.",
    sk: "E-shop je krátko mimo prevádzky. Čoskoro sa vrátime s ešte príjemnejším nákupom."
  },
  expectedBackAt: null
};

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function parseMaintenanceSettings(value: unknown): MaintenanceSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultMaintenanceSettings;
  const stored = value as Record<string, unknown>;
  const headline = stored.headline && typeof stored.headline === "object" && !Array.isArray(stored.headline)
    ? stored.headline as Record<string, unknown>
    : {};
  const message = stored.message && typeof stored.message === "object" && !Array.isArray(stored.message)
    ? stored.message as Record<string, unknown>
    : {};
  const expectedBackAt = typeof stored.expectedBackAt === "string" && !Number.isNaN(Date.parse(stored.expectedBackAt))
    ? stored.expectedBackAt
    : null;

  return {
    enabled: stored.enabled === true,
    countdownEnabled: stored.countdownEnabled === true,
    headline: {
      cs: text(headline.cs, defaultMaintenanceSettings.headline.cs),
      sk: text(headline.sk, defaultMaintenanceSettings.headline.sk)
    },
    message: {
      cs: text(message.cs, defaultMaintenanceSettings.message.cs),
      sk: text(message.sk, defaultMaintenanceSettings.message.sk)
    },
    expectedBackAt
  };
}

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  complete: boolean;
};

export function getCountdownParts(targetAt: string, now = Date.now()): CountdownParts {
  const target = Date.parse(targetAt);
  const remaining = Number.isNaN(target) ? 0 : Math.max(0, target - now);
  const totalSeconds = Math.floor(remaining / 1_000);

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    complete: remaining === 0
  };
}

export function isMaintenanceActive(settings: MaintenanceSettings, now = Date.now()) {
  if (!settings.enabled) return false;
  if (!settings.expectedBackAt) return true;
  const expectedBackAt = Date.parse(settings.expectedBackAt);
  return Number.isNaN(expectedBackAt) || expectedBackAt > now;
}

export function getMaintenanceLocale(pathname: string): MaintenanceLocale {
  return pathname === "/sk" || pathname.startsWith("/sk/") ? "sk" : "cs";
}

function dateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function timeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = dateParts(date, timeZone);
  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (representedAsUtc - date.getTime()) / 60_000;
}

export function formatPragueDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = dateParts(date, "Europe/Prague");
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function pragueDateTimeLocalToIso(value: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const localAsUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  let instant = localAsUtc - timeZoneOffsetMinutes(new Date(localAsUtc), "Europe/Prague") * 60_000;
  instant = localAsUtc - timeZoneOffsetMinutes(new Date(instant), "Europe/Prague") * 60_000;
  const result = new Date(instant);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

export function isMaintenanceExemptPath(pathname: string) {
  return pathname === "/maintenance" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth/") ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/cron/") ||
    pathname === "/api/payments/gopay/notification" ||
    pathname === "/api/payments/gopay/return" ||
    pathname === "/cs/objednavka/dekujeme" ||
    pathname === "/sk/objednavka/dakujeme";
}

export function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function isLocalDevelopmentHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}
