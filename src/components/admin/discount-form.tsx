"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, LoaderCircle, Save, TicketPercent, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DiscountCodeInput } from "@/lib/discounts/schema";

type InitialDiscount = DiscountCodeInput & { id?: string; usageCount?: number; source?: "admin" | "loyalty" | "birthday" };

export function DiscountForm({ initial }: { initial: InitialDiscount }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initial));
  const dirty = JSON.stringify(form) !== savedSnapshot;

  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        document.getElementById("discount-submit")?.click();
      }
    };
    window.addEventListener("beforeunload", leave);
    window.addEventListener("keydown", shortcut);
    return () => { window.removeEventListener("beforeunload", leave); window.removeEventListener("keydown", shortcut); };
  }, [dirty]);

  function update<K extends keyof DiscountCodeInput>(key: K, value: DiscountCodeInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage(""); setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch(initial.id ? `/api/admin/discounts/${initial.id}` : "/api/admin/discounts", {
        method: initial.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error ?? "Slevový kód se nepodařilo uložit.");
      setMessage("Slevový kód je uložený.");
      setSavedSnapshot(JSON.stringify(form));
      if (!initial.id) router.replace(`/admin/discounts/${result.id}`);
      else router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Slevový kód se nepodařilo uložit."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!initial.id || !window.confirm(`Opravdu chcete smazat kód ${form.code}? Tuto akci nelze vrátit.`)) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/admin/discounts/${initial.id}`, { method: "DELETE" });
      const result = await response.json() as { deleted?: boolean; error?: string };
      if (!response.ok || !result.deleted) throw new Error(result.error ?? "Slevový kód se nepodařilo smazat.");
      router.replace("/admin/discounts");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Slevový kód se nepodařilo smazat."); }
    finally { setBusy(false); }
  }

  return (
    <form className="mt-8 grid gap-6" onSubmit={submit}>
      <section className="rounded-brand border border-line bg-white p-6">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-brand bg-blush text-ruby"><TicketPercent size={20} /></span><div><h2 className="font-redhat text-lg font-semibold">Základní údaje</h2><p className="font-redhat text-xs text-muted">Interní název vidíte pouze vy. Kód zadává zákazník.</p></div></div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Interní název" required><input className="admin-input" maxLength={100} onChange={(e) => update("internalName", e.target.value)} required value={form.internalName} /></Field>
          <Field hint="Písmena bez diakritiky, čísla, - nebo _." label="Kód kuponu" required><input autoCapitalize="characters" className="admin-input font-mono uppercase" maxLength={32} onChange={(e) => update("code", e.target.value.toUpperCase())} required value={form.code} /></Field>
        </div>
      </section>

      <section className="rounded-brand border border-line bg-white p-6">
        <h2 className="font-redhat text-lg font-semibold">Pravidla slevy</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Typ slevy"><select className="admin-input" onChange={(e) => update("discountType", e.target.value as "percent" | "fixed" | "free_shipping")} value={form.discountType}><option value="percent">Procentní</option><option value="fixed">Pevná částka</option><option value="free_shipping">Doprava zdarma</option></select></Field>
          {form.discountType === "free_shipping" ? <Field hint="Odečte celou cenu zvoleného způsobu dopravy." label="Hodnota"><div className="grid min-h-11 items-center rounded-brand border border-line bg-blush px-3 text-sm font-medium text-muted">Podle zvolené dopravy</div></Field> : <Field label={form.discountType === "percent" ? "Sleva v %" : "Částka slevy"} required><input className="admin-input" max={form.discountType === "percent" ? 100 : undefined} min="1" onChange={(e) => update("value", Number(e.target.value))} required step={form.discountType === "percent" ? "1" : "0.01"} type="number" value={form.value} /></Field>}
          <Field hint={form.discountType === "percent" ? "Lze omezit na jednu měnu." : "Povinné u pevné částky."} label="Měna"><select className="admin-input" onChange={(e) => update("currency", e.target.value ? e.target.value as "CZK" | "EUR" : null)} value={form.currency ?? ""}><option value="">CZK i EUR</option><option value="CZK">CZK</option><option value="EUR">EUR</option></select></Field>
          <Field label="Minimální útrata"><input className="admin-input" min="0" onChange={(e) => update("minimumOrderValue", Number(e.target.value))} step="0.01" type="number" value={form.minimumOrderValue} /></Field>
        </div>
      </section>

      <section className="rounded-brand border border-line bg-white p-6">
        <h2 className="font-redhat text-lg font-semibold">Platnost a limity</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <Field hint="Platí od začátku zvoleného dne. Prázdné = ihned." label="Začátek platnosti"><input className="admin-input" onChange={(e) => update("validFrom", e.target.value || null)} type="date" value={form.validFrom ?? ""} /></Field>
          <Field hint="Platí do konce zvoleného dne. Prázdné = bez konce." label="Konec platnosti"><input className="admin-input" min={form.validFrom ?? undefined} onChange={(e) => update("validTo", e.target.value || null)} type="date" value={form.validTo ?? ""} /></Field>
          <Field hint={`Dosud použito: ${initial.usageCount ?? 0}. Prázdné = bez limitu.`} label="Celkový počet použití"><input className="admin-input" min="1" onChange={(e) => update("usageLimit", e.target.value ? Number(e.target.value) : null)} step="1" type="number" value={form.usageLimit ?? ""} /></Field>
        </div>
        <label className="mt-6 flex cursor-pointer items-center justify-between gap-5 rounded-brand border border-line bg-blush p-4 font-redhat">
          <span><strong className="block text-sm">Aktivní kód</strong><span className="mt-1 block text-xs text-muted">Zákazníci jej mohou použít pouze během nastavené platnosti.</span></span>
          <input checked={form.active} className="size-5 accent-ruby" onChange={(e) => update("active", e.target.checked)} type="checkbox" />
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-brand border border-line bg-white/95 p-4 shadow-soft backdrop-blur md:sticky md:bottom-4 md:z-10">
        <Link className="inline-flex items-center gap-2 font-redhat text-sm font-semibold text-muted hover:text-ruby" href="/admin/discounts"><ArrowLeft size={17} />Zpět na přehled</Link>
        <div className="flex flex-wrap items-center justify-end gap-3">{error ? <p className="w-full font-redhat text-sm font-semibold text-red-700 sm:w-auto" role="alert">{error}</p> : null}{message ? <p className="w-full font-redhat text-sm font-semibold text-emerald-700 sm:w-auto" role="status">{message}</p> : null}{initial.id && initial.source === "admin" ? <button className="inline-flex min-h-11 items-center gap-2 rounded-brand border border-red-200 px-4 font-redhat text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50" disabled={busy} onClick={() => void remove()} type="button"><Trash2 size={17} />Smazat kód</button> : null}<button className="inline-flex min-h-11 items-center gap-2 rounded-brand bg-ruby px-5 font-redhat text-sm font-semibold text-white disabled:opacity-50" disabled={busy} id="discount-submit" type="submit">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}Uložit kód</button></div>
      </div>
      <style jsx>{`.admin-input{min-height:44px;width:100%;border:1px solid #e6e2df;border-radius:8px;background:#fff;padding:0 12px;font-family:var(--font-redhat),sans-serif;font-size:14px}.admin-input:focus{outline:2px solid rgba(175,33,36,.22);border-color:#af2124}`}</style>
    </form>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid content-start gap-2 font-redhat text-sm font-semibold"><span>{label}{required ? <span className="text-ruby"> *</span> : null}</span>{children}{hint ? <span className="text-xs font-normal leading-5 text-muted">{hint}</span> : null}</label>;
}
