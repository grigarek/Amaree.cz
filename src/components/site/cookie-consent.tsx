"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

const consentKey = "amaree-cookie-consent";
const consentEvent = "amaree-cookie-consent-change";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(consentEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(consentEvent, onStoreChange);
  };
}

function getSnapshot() {
  return localStorage.getItem(consentKey) !== "saved";
}

function saveConsent() {
  localStorage.setItem(consentKey, "saved");
  window.dispatchEvent(new Event(consentEvent));
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
          onClick={saveConsent}
        >
          {t("accept")}
        </button>
        <button
          className="rounded-brand border border-line px-4 py-2 font-redhat text-sm font-semibold"
          onClick={saveConsent}
        >
          {t("necessary")}
        </button>
      </div>
    </div>
  );
}
