const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const PRAGUE_TIME_ZONE = "Europe/Prague";

function partsAt(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PRAGUE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function localMidnightUtc(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  let timestamp = target;

  // Two passes resolve the UTC offset, including Czech daylight-saving time.
  for (let pass = 0; pass < 2; pass += 1) {
    const observed = partsAt(timestamp);
    timestamp += target - Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second);
  }
  return timestamp;
}

export function isDateOnly(value: string) {
  if (!DATE_ONLY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function toPragueDateInput(value: string | null) {
  if (!value) return "";
  if (isDateOnly(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PRAGUE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function discountDateBoundaryIso(value: string, boundary: "start" | "end") {
  if (!isDateOnly(value)) throw new Error("invalid_discount_date");
  if (boundary === "start") return new Date(localMidnightUtc(value)).toISOString();

  const [year, month, day] = value.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDate = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  return new Date(localMidnightUtc(nextDate) - 1).toISOString();
}
