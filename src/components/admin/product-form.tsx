"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Archive, Check, Copy, LoaderCircle, Power, Save } from "lucide-react";
import { NewProductImages, type NewProductImageDraft } from "@/components/admin/new-product-images";
import { parseAdminProductFormData } from "@/lib/products/admin-product-form";
import type { AdminProductInput } from "@/lib/products/admin-product-schema";

const locales = ["cs", "en", "de"] as const;
const localeLabels = { cs: "Čeština", en: "English", de: "Deutsch" };

function major(minor: number | null) {
  return minor === null ? "" : String(minor / 100);
}

export function ProductForm({ initial, productId }: { initial: AdminProductInput; productId?: string }) {
  const router = useRouter();
  const [locale, setLocale] = useState<(typeof locales)[number]>("cs");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [imageDrafts, setImageDrafts] = useState<NewProductImageDraft[]>([]);
  const [imageError, setImageError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = parseAdminProductFormData(formData);
    if (!parsed.success) {
      setMessage({ type: "error", text: parsed.error.issues[0]?.message ?? "Zkontrolujte vyplněná pole." });
      return;
    }
    if (!productId && !imageDrafts.length) {
      setImageError("Přidejte alespoň jednu produktovou fotografii.");
      document.getElementById("new-product-images")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data)
      });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error ?? "Produkt se nepodařilo uložit.");
      if (!productId) {
        const imageData = new FormData();
        imageDrafts.forEach((draft) => imageData.append("files", draft.file));
        imageData.set("metadata", JSON.stringify(imageDrafts.map((draft) => ({
          alt: {
            cs: draft.alt.cs.trim() || parsed.data.translations.cs.name,
            en: draft.alt.en.trim() || parsed.data.translations.en.name,
            de: draft.alt.de.trim() || parsed.data.translations.de.name
          }
        }))));
        const imageResponse = await fetch(`/api/admin/products/${result.id}/images`, { method: "POST", body: imageData });
        const imageResult = await imageResponse.json() as { error?: string };
        if (!imageResponse.ok) {
          setMessage({ type: "error", text: `Produkt byl uložen, ale fotografie se nepodařilo nahrát: ${imageResult.error ?? "neznámá chyba"}` });
          router.push(`/admin/products/${result.id}?imageUpload=failed`);
          router.refresh();
          return;
        }
      }
      setMessage({ type: "success", text: "Produkt i fotografie byly bezpečně uloženy." });
      router.push(`/admin/products/${result.id}`);
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Produkt se nepodařilo uložit." });
    } finally {
      setSaving(false);
    }
  }

  async function lifecycle(action: "duplicate" | "archive" | "activate" | "deactivate") {
    if (!productId) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/products/${productId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Akci se nepodařilo provést.");
      if (action === "duplicate" && result.id) router.push(`/admin/products/${result.id}`);
      else router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Akci se nepodařilo provést." });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "min-h-11 w-full rounded-brand border border-line bg-white px-3 py-2 font-redhat text-sm outline-none focus:border-ruby focus:ring-1 focus:ring-ruby/15";
  const labelClass = "grid gap-2 font-redhat text-sm font-semibold text-ink";

  return (
    <form className="mt-8 space-y-8" onSubmit={submit} noValidate>
      <section className="border-y border-line py-6">
        <h2 className="font-newsreader text-3xl">Základní údaje</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <label className={labelClass}>Interní ID<input className={inputClass} defaultValue={initial.internalId} name="internalId" required /></label>
          <label className={labelClass}>SKU<input className={inputClass} defaultValue={initial.sku} name="sku" required /></label>
          <label className={labelClass}>Kategorie<select className={inputClass} defaultValue={initial.category} name="category"><option value="necklaces">Náhrdelníky</option><option value="earrings">Náušnice</option><option value="bracelets">Náramky</option></select></label>
          <label className={labelClass}>Hmotnost (g)<input className={inputClass} defaultValue={initial.weightGrams} min="0.001" name="weightGrams" required step="0.001" type="number" /></label>
          <label className={labelClass}>Sklad<input className={inputClass} defaultValue={initial.stockQuantity} min="0" name="stockQuantity" required step="1" type="number" /></label>
          <label className={labelClass}>Nízký stav skladu<input className={inputClass} defaultValue={initial.lowStockThreshold} min="0" name="lowStockThreshold" required step="1" type="number" /></label>
          <label className={labelClass}>Pořadí<input className={inputClass} defaultValue={initial.sortOrder} name="sortOrder" required step="1" type="number" /></label>
        </div>
        <div className="mt-6 flex flex-wrap gap-6 font-redhat text-sm font-semibold">
          <input name="active" type="hidden" value={initial.active ? "on" : ""} />
          <span className="font-redhat text-sm font-semibold">Stav: {initial.active ? "aktivní" : "neaktivní"}</span>
          <label className="flex items-center gap-2"><input defaultChecked={initial.featured} name="featured" type="checkbox" /> Doporučený</label>
          <label className="flex items-center gap-2"><input defaultChecked={initial.isNew} name="isNew" type="checkbox" /> Novinka</label>
        </div>
      </section>

      {!productId ? <NewProductImages drafts={imageDrafts} error={imageError} onChange={setImageDrafts} onError={setImageError} /> : null}

      <section className="border-b border-line pb-7">
        <h2 className="font-newsreader text-3xl">Ceny</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-4">
          <label className={labelClass}>Cena CZK<input className={inputClass} defaultValue={major(initial.prices.CZK.amountMinor)} min="0" name="priceCzk" required step="0.01" type="number" /></label>
          <label className={labelClass}>Původní cena CZK<input className={inputClass} defaultValue={major(initial.prices.CZK.originalAmountMinor)} min="0" name="originalPriceCzk" step="0.01" type="number" /></label>
          <label className={labelClass}>Cena EUR<input className={inputClass} defaultValue={major(initial.prices.EUR.amountMinor)} min="0" name="priceEur" required step="0.01" type="number" /></label>
          <label className={labelClass}>Původní cena EUR<input className={inputClass} defaultValue={major(initial.prices.EUR.originalAmountMinor)} min="0" name="originalPriceEur" step="0.01" type="number" /></label>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-newsreader text-3xl">Obsah a SEO</h2>
          <div className="inline-flex rounded-brand border border-line bg-white p-1" role="tablist" aria-label="Jazyk produktu">
            {locales.map((item) => <button aria-selected={locale === item} className={`min-h-10 px-4 font-redhat text-sm font-semibold ${locale === item ? "bg-ruby text-white" : "text-ink"}`} key={item} onClick={() => setLocale(item)} role="tab" type="button">{localeLabels[item]}</button>)}
          </div>
        </div>
        {locales.map((item) => {
          const value = initial.translations[item];
          return (
            <fieldset className={locale === item ? "mt-6 grid gap-5" : "hidden"} key={item}>
              <legend className="sr-only">{localeLabels[item]}</legend>
              <div className="grid gap-5 md:grid-cols-2">
                <label className={labelClass}>Název<input className={inputClass} defaultValue={value.name} name={`${item}.name`} required /></label>
                <label className={labelClass}>Slug<input className={inputClass} defaultValue={value.slug} name={`${item}.slug`} required /></label>
              </div>
              <label className={labelClass}>Krátký popis<textarea className={`${inputClass} min-h-24`} defaultValue={value.shortDescription} name={`${item}.shortDescription`} required /></label>
              <label className={labelClass}>Dlouhý popis<textarea className={`${inputClass} min-h-40`} defaultValue={value.longDescription} name={`${item}.longDescription`} required /></label>
              <div className="grid gap-5 md:grid-cols-3">
                <label className={labelClass}>Materiál<input className={inputClass} defaultValue={value.material} name={`${item}.material`} required /></label>
                <label className={labelClass}>Barva<input className={inputClass} defaultValue={value.color} name={`${item}.color`} required /></label>
                <label className={labelClass}>Rozměry<input className={inputClass} defaultValue={value.dimensions} name={`${item}.dimensions`} required /></label>
              </div>
              <label className={labelClass}>Péče o šperk<textarea className={`${inputClass} min-h-28`} defaultValue={value.care} name={`${item}.care`} required /></label>
              <div className="grid gap-5 md:grid-cols-2">
                <label className={labelClass}>SEO title<input className={inputClass} defaultValue={value.seoTitle} maxLength={70} name={`${item}.seoTitle`} required /></label>
                <label className={labelClass}>SEO description<textarea className={`${inputClass} min-h-24`} defaultValue={value.seoDescription} maxLength={170} name={`${item}.seoDescription`} required /></label>
              </div>
            </fieldset>
          );
        })}
      </section>

      {message ? <p aria-live="polite" className={`font-redhat text-sm font-semibold ${message.type === "error" ? "text-red-700" : "text-emerald-700"}`}>{message.text}</p> : null}

      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-ivory/95 py-4 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {productId ? <button className="inline-flex min-h-11 items-center gap-2 border border-line bg-white px-4 font-redhat text-sm font-semibold" disabled={saving} onClick={() => lifecycle("duplicate")} type="button"><Copy size={17} />Duplikovat</button> : null}
          {productId ? <button className="inline-flex min-h-11 items-center gap-2 border border-line bg-white px-4 font-redhat text-sm font-semibold" disabled={saving} onClick={() => lifecycle(initial.active ? "deactivate" : "activate")} type="button">{initial.active ? <Power size={17} /> : <Check size={17} />}{initial.active ? "Deaktivovat" : "Aktivovat"}</button> : null}
          {productId ? <button className="inline-flex min-h-11 items-center gap-2 border border-line bg-white px-4 font-redhat text-sm font-semibold" disabled={saving} onClick={() => lifecycle("archive")} type="button"><Archive size={17} />Archivovat</button> : null}
        </div>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-brand bg-ruby px-6 font-redhat text-sm font-semibold text-white disabled:opacity-50" disabled={saving} type="submit">{saving ? <LoaderCircle className="animate-spin" size={18} /> : <Save size={18} />}{productId ? "Uložit produkt" : "Vytvořit produkt s fotografiemi"}</button>
      </div>
    </form>
  );
}
