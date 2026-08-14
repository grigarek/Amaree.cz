export const ANALYTICS_CONSENT_KEY = "amaree-cookie-consent";
export const ANALYTICS_CONSENT_EVENT = "amaree-cookie-consent-change";
export const INTERNAL_VISITOR_KEY = "amaree-internal-visitor";
export const INTERNAL_VISITOR_EVENT = "amaree-internal-visitor-change";

export type AnalyticsConsent = "analytics" | "necessary";

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
  return value === "analytics" || value === "necessary" ? value : null;
}

export function isInternalVisitor(): boolean {
  if (typeof window === "undefined") return false;
  return isInternalVisitorValue(window.localStorage.getItem(INTERNAL_VISITOR_KEY));
}

export function isInternalVisitorValue(value: string | null): boolean {
  return value === "1";
}
