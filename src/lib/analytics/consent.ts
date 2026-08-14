export const ANALYTICS_CONSENT_KEY = "amaree-cookie-consent";
export const ANALYTICS_CONSENT_EVENT = "amaree-cookie-consent-change";

export type AnalyticsConsent = "analytics" | "necessary";

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
  return value === "analytics" || value === "necessary" ? value : null;
}
