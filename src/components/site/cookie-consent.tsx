"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ANALYTICS_CONSENT_EVENT, ANALYTICS_CONSENT_KEY, getAnalyticsConsent, type AnalyticsConsent } from "@/lib/analytics/consent";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(ANALYTICS_CONSENT_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(ANALYTICS_CONSENT_EVENT, onStoreChange);
  };
}

function getSnapshot() {
  return getAnalyticsConsent() === null;
}

function saveConsent(consent: AnalyticsConsent) {
  localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
}

export function CookieConsent() {
  const t = useTranslations("cookie");
  const visible = useSyncExternalStore(subscribe, getSnapshot, () => false);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-brand border border-line bg-white p-4 shadow-soft md:left-auto md:max-w-md">
      <p className="font-redhat text-sm text-muted">{t("message")}</p>
      <div className="mt-4 flex gap-2">
        <button
          className="rounded-brand bg-ruby px-4 py-2 font-redhat text-sm font-semibold text-white"
          onClick={() => saveConsent("analytics")}
        >
          {t("accept")}
        </button>
        <button
          className="rounded-brand border border-line px-4 py-2 font-redhat text-sm font-semibold"
          onClick={() => saveConsent("necessary")}
        >
          {t("necessary")}
        </button>
      </div>
    </div>
  );
}
