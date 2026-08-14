"use client";

import Link from "next/link";
import { Check, LoaderCircle, Send } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { localizedPaths, type Locale } from "@/i18n/routing";

const copy = {
  cs: { title: "Napište nám", name: "Jméno a příjmení", order: "Číslo objednávky (nepovinné)", message: "S čím vám můžeme pomoci?", consent: "Souhlasím se zpracováním údajů pro vyřízení zprávy podle", privacy: "zásad ochrany osobních údajů", submit: "Odeslat zprávu", success: "Děkujeme. Zpráva byla odeslána.", error: "Zprávu se nepodařilo odeslat. Napište prosím na info@amaree.cz." },
  sk: { title: "Napíšte nám", name: "Meno a priezvisko", order: "Číslo objednávky (nepovinné)", message: "S čím vám môžeme pomôcť?", consent: "Súhlasím so spracovaním údajov na vybavenie správy podľa", privacy: "zásad ochrany osobných údajov", submit: "Odoslať správu", success: "Ďakujeme. Správa bola odoslaná.", error: "Správu sa nepodarilo odoslať. Napíšte prosím na info@amaree.cz." },
  en: { title: "Send us a message", name: "Full name", order: "Order number (optional)", message: "How can we help?", consent: "I agree to processing my details to handle this message under the", privacy: "privacy policy", submit: "Send message", success: "Thank you. Your message has been sent.", error: "The message could not be sent. Please email info@amaree.cz." },
  de: { title: "Schreiben Sie uns", name: "Vor- und Nachname", order: "Bestellnummer (optional)", message: "Wie können wir helfen?", consent: "Ich stimme der Verarbeitung meiner Angaben zur Bearbeitung gemäß der", privacy: "Datenschutzerklärung", submit: "Nachricht senden", success: "Vielen Dank. Ihre Nachricht wurde gesendet.", error: "Die Nachricht konnte nicht gesendet werden. Schreiben Sie bitte an info@amaree.cz." }
} as const;

export function ContactForm({ locale }: { locale: Locale }) {
  const startedAt = useRef(0);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("loading");
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"), email: data.get("email"), orderNumber: data.get("orderNumber"), message: data.get("message"),
        consent: data.get("consent") === "on", company: data.get("company"), locale, startedAt: startedAt.current
      })
    }).catch(() => null);
    if (response?.ok) {
      form.reset();
      setStatus("success");
    } else setStatus("error");
  }

  const inputClass = "min-h-12 w-full rounded-brand border border-line bg-white px-4 font-redhat text-sm outline-none transition focus:border-ruby focus:ring-2 focus:ring-ruby/15";
  return (
    <form className="mt-10 border-t border-line pt-8" onFocus={() => { if (!startedAt.current) startedAt.current = Date.now(); }} onSubmit={submit}>
      <h2 className="font-newsreader text-3xl text-ink">{copy[locale].title}</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 font-redhat text-sm font-semibold text-ink">{copy[locale].name}<input className={inputClass} name="name" required /></label>
        <label className="grid gap-2 font-redhat text-sm font-semibold text-ink">E-mail<input autoComplete="email" className={inputClass} name="email" required type="email" /></label>
        <label className="grid gap-2 font-redhat text-sm font-semibold text-ink md:col-span-2">{copy[locale].order}<input className={inputClass} name="orderNumber" /></label>
        <label className="grid gap-2 font-redhat text-sm font-semibold text-ink md:col-span-2">{copy[locale].message}<textarea className={`${inputClass} min-h-36 resize-y py-3`} maxLength={5000} minLength={10} name="message" required /></label>
      </div>
      <input aria-hidden="true" autoComplete="off" className="absolute -left-[9999px]" name="company" tabIndex={-1} type="text" />
      <label className="mt-5 flex items-start gap-2 font-redhat text-xs leading-5 text-muted"><input className="mt-1 accent-ruby" name="consent" required type="checkbox" /><span>{copy[locale].consent} <Link className="underline underline-offset-2 hover:text-ruby" href={localizedPaths[locale].privacy}>{copy[locale].privacy}</Link>.</span></label>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button className="inline-flex min-h-12 items-center gap-2 rounded-brand bg-ruby px-6 py-3 font-redhat text-sm font-semibold text-white transition hover:bg-ruby/90 disabled:cursor-wait disabled:opacity-60" disabled={status === "loading"} type="submit">
          {status === "loading" ? <LoaderCircle className="animate-spin" size={17} /> : status === "success" ? <Check size={17} /> : <Send size={17} />}{copy[locale].submit}
        </button>
        <p aria-live="polite" className={`font-redhat text-sm ${status === "error" ? "text-ruby" : "text-ink"}`}>{status === "success" ? copy[locale].success : status === "error" ? copy[locale].error : ""}</p>
      </div>
    </form>
  );
}
