"use client";

import { useEffect, useState } from "react";
import { getCountdownParts, type CountdownParts, type MaintenanceLocale } from "@/lib/maintenance";

const emptyCountdown: CountdownParts = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  complete: false
};

export function MaintenanceCountdown({ targetAt, locale }: { targetAt: string; locale: MaintenanceLocale }) {
  const [countdown, setCountdown] = useState<CountdownParts | null>(null);

  useEffect(() => {
    const update = () => setCountdown(getCountdownParts(targetAt));
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [targetAt]);

  const value = countdown ?? emptyCountdown;
  const labels = locale === "sk"
    ? ["dní", "hodín", "minút", "sekúnd"]
    : ["dní", "hodin", "minut", "sekund"];
  const values = [value.days, value.hours, value.minutes, value.seconds];

  return <div className="mx-auto mt-9 max-w-2xl" aria-live="polite">
    <div className="grid grid-cols-4 gap-2 sm:gap-4">
      {values.map((item, index) => <div className="min-w-0 border-y border-line py-4 text-center sm:py-5" key={labels[index]}>
        <span className="block font-newsreader text-3xl tabular-nums text-ink sm:text-5xl">{countdown ? String(item).padStart(2, "0") : "--"}</span>
        <span className="mt-1 block font-redhat text-[9px] font-semibold uppercase tracking-[0.12em] text-muted sm:text-xs">{labels[index]}</span>
      </div>)}
    </div>
    {countdown?.complete ? <p className="mt-5 font-redhat text-sm font-semibold text-ruby">{locale === "sk" ? "E-shop práve spúšťame." : "E-shop právě spouštíme."}</p> : null}
  </div>;
}
