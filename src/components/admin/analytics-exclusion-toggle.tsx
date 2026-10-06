"use client";

import { useSyncExternalStore } from "react";
import { BarChart3 } from "lucide-react";
import { INTERNAL_VISITOR_EVENT, INTERNAL_VISITOR_KEY, isInternalVisitor } from "@/lib/analytics/consent";

export function AnalyticsExclusionToggle() {
  const excluded = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(INTERNAL_VISITOR_EVENT, onStoreChange);
      window.addEventListener("storage", onStoreChange);
      return () => {
        window.removeEventListener(INTERNAL_VISITOR_EVENT, onStoreChange);
        window.removeEventListener("storage", onStoreChange);
      };
    },
    isInternalVisitor,
    () => false
  );

  function update(nextValue: boolean) {
    if (nextValue) window.localStorage.setItem(INTERNAL_VISITOR_KEY, "1");
    else window.localStorage.removeItem(INTERNAL_VISITOR_KEY);
    window.dispatchEvent(new Event(INTERNAL_VISITOR_EVENT));
  }

  return (
    <section className="mt-8 max-w-2xl border border-line bg-white p-6">
      <div className="flex items-start gap-4">
        <BarChart3 className="mt-1 shrink-0 text-ruby" size={23} />
        <div className="min-w-0 flex-1">
          <h2 className="font-newsreader text-3xl">Vlastní návštěvy</h2>
          <p className="mt-2 font-redhat text-sm leading-6 text-muted">Vyloučí návštěvy z tohoto prohlížeče z detailní analytiky AMARÉE. Nastavení platí i při změně IP adresy.</p>
          <label className="mt-5 flex cursor-pointer items-center justify-between gap-5 border border-line p-4 font-redhat text-sm font-semibold">
            <span><strong className="block">Nezapočítávat toto zařízení</strong><span className="mt-1 block font-normal text-muted">Zapněte také v telefonu nebo jiném prohlížeči, ze kterého web kontrolujete.</span></span>
            <span className="relative inline-flex h-7 w-12 shrink-0">
              <input checked={excluded} className="peer sr-only" onChange={(event) => update(event.target.checked)} type="checkbox" />
              <span className="absolute inset-0 rounded-full bg-line transition peer-checked:bg-ruby" />
              <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </span>
          </label>
          <p className={`mt-4 font-redhat text-xs font-semibold ${excluded ? "text-emerald-700" : "text-amber-700"}`} role="status">{excluded ? "Tento prohlížeč je z detailní analytiky vyloučený." : "Tento prohlížeč se nyní do analytiky započítává."}</p>
        </div>
      </div>
    </section>
  );
}
