"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { ANALYTICS_CONSENT_EVENT, getAnalyticsConsent } from "@/lib/analytics/consent";

const sessionKey = "amaree-analytics-session";

function getSessionId() {
  const stored = window.sessionStorage.getItem(sessionKey);
  if (stored) return stored;
  const created = window.crypto.randomUUID();
  window.sessionStorage.setItem(sessionKey, created);
  return created;
}

function sendEvent(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/analytics", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
}

export function AnalyticsTracker({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const activeSince = useRef<number | null>(null);
  const activeSeconds = useRef(0);
  const trackedPath = useRef(pathname);

  useEffect(() => {
    const flush = () => {
      if (getAnalyticsConsent() !== "analytics") return;
      if (activeSince.current !== null) {
        activeSeconds.current += (performance.now() - activeSince.current) / 1000;
        activeSince.current = null;
      }
      const duration = Math.min(86400, Math.round(activeSeconds.current));
      if (duration > 0) sendEvent({ eventType: "page_engagement", sessionId: getSessionId(), locale, path: trackedPath.current, durationSeconds: duration });
      activeSeconds.current = 0;
    };
    const start = () => {
      if (document.visibilityState === "visible" && getAnalyticsConsent() === "analytics" && activeSince.current === null) activeSince.current = performance.now();
    };
    const pageView = () => {
      if (getAnalyticsConsent() !== "analytics") return;
      const referrerHost = (() => { try { return document.referrer ? new URL(document.referrer).hostname : undefined; } catch { return undefined; } })();
      sendEvent({ eventType: "page_view", sessionId: getSessionId(), locale, path: pathname, referrerHost });
      start();
    };
    const onVisibility = () => document.visibilityState === "hidden" ? flush() : start();
    const onConsent = () => { if (getAnalyticsConsent() === "analytics") pageView(); else flush(); };

    pageView();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener(ANALYTICS_CONSENT_EVENT, onConsent);
    return () => {
      flush();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, onConsent);
    };
  }, [locale, pathname]);

  useEffect(() => {
    trackedPath.current = pathname;
  }, [pathname]);

  return null;
}
