"use client";

import Link from "next/link";
import { Check, LoaderCircle } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { localizedPaths, type Locale } from "@/i18n/routing";

const copy = {
  cs: { submit: "Přihlásit", consent: "Souhlasím se zasíláním novinek a se zpracováním e-mailu podle", privacy: "zásad ochrany osobních údajů", success: "Hotovo. Potvrďte prosím přihlášení v e-mailu.", error: "Přihlášení se nepodařilo. Zkuste to prosím znovu." },
  sk: { submit: "Prihlásiť", consent: "Súhlasím so zasielaním noviniek a spracovaním e-mailu podľa", privacy: "zásad ochrany osobných údajov", success: "Hotovo. Potvrďte prosím prihlásenie v e-maile.", error: "Prihlásenie sa nepodarilo. Skúste to prosím znova." },
  en: { submit: "Subscribe", consent: "I agree to receive news and to email processing under the", privacy: "privacy policy", success: "Almost done. Please confirm your subscription by email.", error: "Subscription failed. Please try again." },
  de: { submit: "Anmelden", consent: "Ich stimme dem Newsletter und der E-Mail-Verarbeitung gemäß der", privacy: "Datenschutzerklärung", success: "Fast fertig. Bitte bestätigen Sie die Anmeldung per E-Mail.", error: "Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut." }
} as const;

export function NewsletterSignup({ locale }: { locale: Locale }) {
  const startedAt = useRef(0);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("loading");
    const response = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.get("email"),
        consent: data.get("consent") === "on",
        company: data.get("company"),
        locale,
        startedAt: startedAt.current
      })
    }).catch(() => null);
    if (response?.ok) {
      form.reset();
      setStatus("success");
    } else {
      setStatus("error");
    }
  }

  return (
    <form className="mx-auto mt-9 max-w-xl" onFocus={() => { if (!startedAt.current) startedAt.current = Date.now(); }} onSubmit={submit}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor={`newsletter-email-${locale}`}>E-mail</label>
        <input autoComplete="email" className="min-h-12 flex-1 rounded-brand border border-line bg-white px-4 font-redhat text-sm outline-none transition focus:border-ruby focus:ring-2 focus:ring-ruby/15" id={`newsletter-email-${locale}`} name="email" placeholder="E-mail" required type="email" />
        <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-brand bg-ruby px-6 py-3 font-redhat text-sm font-semibold text-white transition hover:bg-ruby/90 disabled:cursor-wait disabled:opacity-60" disabled={status === "loading"} type="submit">
          {status === "loading" ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : status === "success" ? <Check aria-hidden="true" size={17} /> : null}
          {copy[locale].submit}
        </button>
      </div>
      <input aria-hidden="true" autoComplete="off" className="absolute -left-[9999px]" name="company" tabIndex={-1} type="text" />
      <label className="mt-4 flex items-start justify-center gap-2 text-left font-redhat text-xs leading-5 text-muted">
        <input className="mt-1 accent-ruby" name="consent" required type="checkbox" />
        <span>{copy[locale].consent} <Link className="underline underline-offset-2 hover:text-ruby" href={localizedPaths[locale].privacy}>{copy[locale].privacy}</Link>.</span>
      </label>
      <p aria-live="polite" className={`mt-3 min-h-5 font-redhat text-sm ${status === "error" ? "text-ruby" : "text-ink"}`}>
        {status === "success" ? copy[locale].success : status === "error" ? copy[locale].error : ""}
      </p>
    </form>
  );
}
