"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  FileText,
  ImageIcon,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Ruler,
  Save,
  Scale,
  SearchCheck,
  Sparkles,
  Settings2
} from "lucide-react";
import { NewProductImages, type NewProductImageDraft } from "@/components/admin/new-product-images";
import { ProductAiAssistant, type ProductAiSnapshot } from "@/components/admin/product-ai-assistant";
import { ProductImages } from "@/components/admin/product-images";
import { selectAppliedProductAiChanges, type ProductAiField, type ProductAiOutput } from "@/lib/ai/product-assistant";
import type { AdminProductImage } from "@/lib/admin/products";
import { parseAdminProductFormData } from "@/lib/products/admin-product-form";
import type { AdminProductInput } from "@/lib/products/admin-product-schema";
import { defaultSeoDescription, defaultSeoTitle } from "@/lib/products/product-identifiers";

const locales = ["cs", "sk", "en", "de"] as const;
const localeLabels = { cs: "Čeština", sk: "Slovenčina", en: "English (volitelné)", de: "Deutsch (volitelné)" };
const statusLabels = { draft: "Koncept", active: "Aktivní", hidden: "Skrytý", archived: "Archivovaný" };
const categoryLabels = { necklaces: "Náhrdelníky", earrings: "Náušnice", bracelets: "Náramky" };
const tabs = [
  { id: "basic", label: "Základní údaje", icon: FileText },
  { id: "description", label: "Popis", icon: Settings2 },
  { id: "photos", label: "Fotografie", icon: ImageIcon },
  { id: "price", label: "Cena a sklad", icon: CircleDollarSign },
  { id: "seo", label: "SEO", icon: SearchCheck },
  { id: "parameters", label: "Parametry", icon: Boxes },
  { id: "publishing", label: "Publikování", icon: PackageCheck },
  { id: "ai", label: "AI pomocník", icon: Sparkles }
] as const;

type TabId = (typeof tabs)[number]["id"];
type Toast = { type: "error" | "success" | "info"; text: string };
type Availability = { skuAvailable: boolean; slugAvailable: boolean; checking: boolean };

function major(minor: number | null) {
  return minor === null ? "" : String(minor / 100);
}

function publicationIssues(form: HTMLFormElement | null, imageCount: number) {
  if (!form) return [];
  const data = new FormData(form);
  const issues: string[] = [];
  if (!String(data.get("cs.name") ?? "").trim()) issues.push("název produktu");
  if (!String(data.get("cs.slug") ?? "").trim()) issues.push("slug");
  if (!String(data.get("sk.name") ?? "").trim()) issues.push("slovenský název");
  if (!String(data.get("sk.slug") ?? "").trim()) issues.push("slovenský slug");
  if (!String(data.get("cs.material") ?? "").trim()) issues.push("materiál");
  if (!String(data.get("cs.dimensions") ?? "").trim()) issues.push("rozměry nebo rozsah nastavení");
  if (Number(String(data.get("priceCzk") ?? "0").replace(",", ".")) <= 0) issues.push("cena CZK");
  if (Number(String(data.get("priceEur") ?? "0").replace(",", ".")) <= 0) issues.push("cena EUR");
  if (String(data.get("stockQuantity") ?? "").trim() === "") issues.push("skladová zásoba");
  if (imageCount < 1) issues.push("hlavní fotografie");
  return issues;
}

function serializeForm(form: HTMLFormElement) {
  const values: Record<string, string> = {};
  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[name]").forEach((field) => {
    if (field instanceof HTMLInputElement && field.type === "file") return;
    values[field.name] = field instanceof HTMLInputElement && field.type === "checkbox"
      ? (field.checked ? "on" : "off")
      : field.value;
  });
  return values;
}

export function ProductForm({ initial, productId, internalId, initialImages = [] }: {
  initial: AdminProductInput;
  productId?: string;
  internalId?: string;
  initialImages?: AdminProductImage[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const manualSaveRef = useRef(false);
  const revisionRef = useRef(0);
  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [locale, setLocale] = useState<(typeof locales)[number]>("cs");
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [imageDrafts, setImageDrafts] = useState<NewProductImageDraft[]>([]);
  const [imageCount, setImageCount] = useState(initialImages.length);
  const [imageError, setImageError] = useState("");
  const [name, setName] = useState(initial.translations.cs.name);
  const [sku, setSku] = useState(initial.sku);
  const [slug, setSlug] = useState(initial.translations.cs.slug);
  const [shortDescription, setShortDescription] = useState(initial.translations.cs.shortDescription);
  const [seoTitle, setSeoTitle] = useState(initial.translations.cs.seoTitle);
  const [seoDescription, setSeoDescription] = useState(initial.translations.cs.seoDescription);
  const [styleTags, setStyleTags] = useState(initial.styleTags.join(", "));
  const [autoSku, setAutoSku] = useState(!initial.sku);
  const [autoSlug, setAutoSlug] = useState(!initial.translations.cs.slug);
  const [autoSeoTitle, setAutoSeoTitle] = useState(!initial.translations.cs.seoTitle);
  const [autoSeoDescription, setAutoSeoDescription] = useState(!initial.translations.cs.seoDescription);
  const [availability, setAvailability] = useState<Availability>({ skuAvailable: true, slugAvailable: true, checking: false });
  const [missing, setMissing] = useState<string[]>([]);
  const storageKey = `amaree:admin-product-draft:${productId ?? "new"}`;

  const notify = useCallback((next: Toast) => {
    setToast(next);
    window.setTimeout(() => setToast((current) => current === next ? null : current), 4200);
  }, []);

  const updateReadiness = useCallback((count = productId ? imageCount : imageDrafts.length) => {
    setMissing(publicationIssues(formRef.current, count));
  }, [imageCount, imageDrafts.length, productId]);

  useEffect(() => {
    updateReadiness();
  }, [updateReadiness]);

  function changed(readinessImageCount?: number | React.ChangeEvent<HTMLFormElement>) {
    const explicitImageCount = typeof readinessImageCount === "number" ? readinessImageCount : undefined;
    setDirty(true);
    setRevision((current) => {
      revisionRef.current = current + 1;
      return current + 1;
    });
    window.setTimeout(() => updateReadiness(explicitImageCount), 0);
  }

  useEffect(() => {
    if (productId) return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const values = JSON.parse(raw) as Record<string, string>;
      window.requestAnimationFrame(() => {
        setName(values["cs.name"] ?? name);
        setSku(values.sku ?? sku);
        setSlug(values["cs.slug"] ?? slug);
        setShortDescription(values["cs.shortDescription"] ?? shortDescription);
        setSeoTitle(values["cs.seoTitle"] ?? seoTitle);
        setSeoDescription(values["cs.seoDescription"] ?? seoDescription);
        setStyleTags(values.styleTags ?? styleTags);
        setAutoSku(false);
        setAutoSlug(false);
        setAutoSeoTitle(false);
        setAutoSeoDescription(false);
        const controlled = new Set(["cs.name", "sku", "cs.slug", "cs.shortDescription", "cs.seoTitle", "cs.seoDescription", "styleTags"]);
        formRef.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[name]").forEach((field) => {
          if (controlled.has(field.name) || !(field.name in values)) return;
          if (field instanceof HTMLInputElement && field.type === "checkbox") field.checked = values[field.name] === "on";
          else field.value = values[field.name];
        });
        updateReadiness();
        notify({ type: "info", text: "Obnoven automaticky uložený koncept z tohoto prohlížeče." });
      });
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    // Draft restoration intentionally runs only on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dirty || revision === 0) return;
    const capturedRevision = revision;
    const timer = window.setTimeout(async () => {
      const form = formRef.current;
      if (!form || manualSaveRef.current) return;
      if (!productId) {
        window.localStorage.setItem(storageKey, JSON.stringify(serializeForm(form)));
        notify({ type: "info", text: "Koncept byl automaticky uložen v tomto prohlížeči." });
        return;
      }
      const parsed = parseAdminProductFormData(new FormData(form));
      if (!parsed.success) return;
      try {
        const response = await fetch(`/api/admin/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data)
        });
        if (!response.ok) return;
        if (capturedRevision === revisionRef.current) setDirty(false);
        notify({ type: "success", text: "Změny byly automaticky uloženy." });
      } catch {
        // A manual save remains available when a transient autosave request fails.
      }
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [dirty, notify, productId, revision, storageKey]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      if (!dirty) return;
      const anchor = (event.target as HTMLElement).closest("a[href]");
      if (anchor && !window.confirm("Máte neuložené změny. Opravdu chcete stránku opustit?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    if (name.trim().length < 2) return;
    const timer = window.setTimeout(async () => {
      const query = new URLSearchParams({ name, sku, slug });
      if (productId) query.set("productId", productId);
      setAvailability((current) => ({ ...current, checking: true }));
      try {
        const response = await fetch(`/api/admin/products/suggestions?${query}`);
        const result = await response.json() as { sku?: string; slug?: string; skuAvailable?: boolean; slugAvailable?: boolean };
        if (!response.ok) return;
        if (autoSku && result.sku) setSku(result.sku);
        if (autoSlug && result.slug) setSlug(result.slug);
        setAvailability({ skuAvailable: result.skuAvailable ?? true, slugAvailable: result.slugAvailable ?? true, checking: false });
      } finally {
        setAvailability((current) => ({ ...current, checking: false }));
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [autoSku, autoSlug, name, productId, sku, slug]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedForm = new FormData(event.currentTarget);
    const parsed = parseAdminProductFormData(submittedForm);
    if (!parsed.success) {
      notify({ type: "error", text: parsed.error.issues[0]?.message ?? "Zkontrolujte vyplněná pole." });
      return;
    }
    const currentMissing = publicationIssues(event.currentTarget, productId ? imageCount : imageDrafts.length);
    if (parsed.data.publicationStatus === "active" && currentMissing.length) {
      setMissing(currentMissing);
      setActiveTab("publishing");
      notify({ type: "error", text: `Produkt nelze publikovat. Chybí: ${currentMissing.join(", ")}.` });
      return;
    }
    let currentAvailability = availability;
    try {
      const query = new URLSearchParams({ name: parsed.data.translations.cs.name, sku: parsed.data.sku, slug: parsed.data.translations.cs.slug });
      if (productId) query.set("productId", productId);
      const availabilityResponse = await fetch(`/api/admin/products/suggestions?${query}`);
      if (availabilityResponse.ok) currentAvailability = { ...(await availabilityResponse.json() as Omit<Availability, "checking">), checking: false };
    } catch {
      // The database unique constraints remain the final protection if this convenience check is temporarily unavailable.
    }
    if (!currentAvailability.skuAvailable || !currentAvailability.slugAvailable) {
      setActiveTab("basic");
      setAvailability(currentAvailability);
      notify({ type: "error", text: !currentAvailability.skuAvailable ? "Toto SKU již používá jiný produkt." : "Tento slug již používá jiný produkt." });
      return;
    }

    manualSaveRef.current = true;
    setSaving(true);
    try {
      const response = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data)
      });
      const result = await response.json() as { id?: string; error?: string; issues?: string[]; requestedStatus?: AdminProductInput["publicationStatus"] };
      if (!response.ok || !result.id) throw new Error(result.error ?? "Produkt se nepodařilo uložit.");

      if (!productId && imageDrafts.length) {
        const imageData = new FormData();
        imageDrafts.forEach((draft) => imageData.append("files", draft.file));
        imageData.set("metadata", JSON.stringify(imageDrafts.map((draft) => ({
          alt: {
            cs: draft.alt.cs.trim() || parsed.data.translations.cs.name,
            sk: draft.alt.sk.trim() || parsed.data.translations.sk.name,
            en: draft.alt.en.trim() || parsed.data.translations.en.name,
            de: draft.alt.de.trim() || parsed.data.translations.de.name
          }
        }))));
        const imageResponse = await fetch(`/api/admin/products/${result.id}/images`, { method: "POST", body: imageData });
        const imageResult = await imageResponse.json() as { error?: string };
        if (!imageResponse.ok) {
          router.push(`/admin/products/${result.id}?imageUpload=failed`);
          throw new Error(`Produkt byl uložen, ale fotografie se nepodařilo nahrát: ${imageResult.error ?? "neznámá chyba"}`);
        }
      }

      if (!productId && result.requestedStatus === "active") {
        const statusResponse = await fetch(`/api/admin/products/${result.id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "setStatus", status: "active" })
        });
        const statusResult = await statusResponse.json() as { error?: string; issues?: string[] };
        if (!statusResponse.ok) throw new Error(statusResult.issues?.length ? `Produkt zůstal jako koncept. Chybí: ${statusResult.issues.join(", ")}.` : statusResult.error);
      }

      window.localStorage.removeItem(storageKey);
      setDirty(false);
      notify({ type: "success", text: productId ? "Produkt byl uložen." : "Produkt a fotografie byly vytvořeny." });
      if (!productId) router.push(`/admin/products/${result.id}`);
      router.refresh();
    } catch (error) {
      notify({ type: "error", text: error instanceof Error ? error.message : "Produkt se nepodařilo uložit." });
    } finally {
      setSaving(false);
      manualSaveRef.current = false;
    }
  }

  async function duplicate() {
    if (!productId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" })
      });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error ?? "Produkt se nepodařilo duplikovat.");
      setDirty(false);
      router.push(`/admin/products/${result.id}`);
    } catch (error) {
      notify({ type: "error", text: error instanceof Error ? error.message : "Produkt se nepodařilo duplikovat." });
    } finally {
      setSaving(false);
    }
  }

  function getAiSnapshot(): ProductAiSnapshot | null {
    const form = formRef.current;
    if (!form) return null;
    const data = new FormData(form);
    const weight = Number(String(data.get("weightGrams") ?? "").replace(",", "."));
    return {
      name: String(data.get("cs.name") ?? "").trim(),
      sku: String(data.get("sku") ?? "").trim(),
      slug: String(data.get("cs.slug") ?? "").trim(),
      category: (String(data.get("category") ?? "necklaces") as AdminProductInput["category"]),
      material: String(data.get("cs.material") ?? "").trim(),
      color: String(data.get("cs.color") ?? "").trim(),
      dimensions: String(data.get("cs.dimensions") ?? "").trim(),
      clasp: String(data.get("cs.clasp") ?? "").trim(),
      stones: String(data.get("cs.stones") ?? "").trim(),
      weightGrams: Number.isFinite(weight) && weight > 0 ? weight : null,
      instructions: "",
      existingText: {
        shortDescription: String(data.get("cs.shortDescription") ?? "").trim(),
        longDescription: String(data.get("cs.longDescription") ?? "").trim(),
        seoTitle: String(data.get("cs.seoTitle") ?? "").trim(),
        seoDescription: String(data.get("cs.seoDescription") ?? "").trim()
      }
    };
  }

  function setUncontrolledField(fieldName: string, value: string) {
    const field = formRef.current?.elements.namedItem(fieldName);
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) return;
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function applyAiSuggestions(output: ProductAiOutput, fields: ProductAiField[]) {
    const selected = new Set(fields);
    const changes = selectAppliedProductAiChanges(output, fields);
    if (changes.name !== undefined) { setName(changes.name); if (autoSeoTitle && !selected.has("seoTitle")) setSeoTitle(defaultSeoTitle(changes.name)); }
    if (changes.shortDescription !== undefined) { setShortDescription(changes.shortDescription); if (autoSeoDescription && !selected.has("seoDescription")) setSeoDescription(defaultSeoDescription(changes.shortDescription)); }
    if (changes.longDescription !== undefined) setUncontrolledField("cs.longDescription", changes.longDescription);
    if (changes.seoTitle !== undefined) { setAutoSeoTitle(false); setSeoTitle(changes.seoTitle); }
    if (changes.seoDescription !== undefined) { setAutoSeoDescription(false); setSeoDescription(changes.seoDescription); }
    if (changes.slug !== undefined) { setAutoSlug(false); setSlug(changes.slug); }
    if (changes.skuSuggestion !== undefined) { setAutoSku(false); setSku(changes.skuSuggestion); }
    if (changes.category !== undefined) setUncontrolledField("category", changes.category);
    if (changes.color !== undefined) setUncontrolledField("cs.color", changes.color);
    if (changes.styleTags !== undefined) setStyleTags(changes.styleTags.join(", "));
    if (changes.localizedParameters !== undefined) {
      for (const item of locales) {
        if (selected.has("dimensions")) setUncontrolledField(`${item}.dimensions`, changes.localizedParameters[item].dimensions);
        if (selected.has("clasp")) setUncontrolledField(`${item}.clasp`, changes.localizedParameters[item].clasp);
      }
    }
    if (changes.imageAltTexts !== undefined) {
      const altById = new Map(changes.imageAltTexts.map((item) => [item.imageId, item.altText]));
      if (imageDrafts.length) {
        setImageDrafts((current) => current.map((draft) => altById.has(draft.id) ? { ...draft, alt: { cs: altById.get(draft.id) as string, sk: altById.get(draft.id) as string, en: altById.get(draft.id) as string, de: altById.get(draft.id) as string } } : draft));
      } else if (productId) {
        for (const image of initialImages) {
          const alt = altById.get(image.id);
          if (!alt) continue;
          const response = await fetch(`/api/admin/products/${productId}/images/${image.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alt: { cs: alt, sk: alt, en: alt, de: alt } })
          });
          if (!response.ok) throw new Error("Některý ALT text fotografie se nepodařilo uložit.");
        }
        router.refresh();
      }
    }
    changed();
    notify({ type: "success", text: "Vybrané návrhy byly vloženy do formuláře. Před uložením je ještě zkontrolujte." });
  }

  const inputClass = "min-h-11 w-full rounded-brand border border-line bg-white px-3 py-2 font-redhat text-sm outline-none focus:border-ruby focus:ring-2 focus:ring-ruby/10";
  const labelClass = "grid gap-2 font-redhat text-sm font-semibold text-ink";
  const panelClass = "border border-line bg-white p-5 md:p-7";
  const visible = (tab: TabId) => activeTab === tab ? "block" : "hidden";

  return (
    <form className="mt-7" noValidate onChange={changed} onSubmit={submit} ref={formRef}>
      <div className="overflow-x-auto border-b border-line" role="tablist" aria-label="Sekce produktu">
        <div className="flex min-w-max gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              aria-selected={activeTab === id}
              className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-4 font-redhat text-sm font-semibold ${activeTab === id ? "border-ruby text-ruby" : "border-transparent text-muted hover:text-ink"}`}
              key={id}
              onClick={() => setActiveTab(id)}
              role="tab"
              type="button"
            ><Icon size={17} />{label}{id === "photos" ? ` (${productId ? imageCount : imageDrafts.length})` : ""}</button>
          ))}
        </div>
      </div>

      <div className={visible("ai")} role="tabpanel">
        <ProductAiAssistant existingImages={initialImages} getSnapshot={getAiSnapshot} imageDrafts={imageDrafts} onApply={applyAiSuggestions} productId={productId} />
      </div>

      <section className={`${visible("basic")} ${panelClass}`} role="tabpanel">
        <div className="flex items-start justify-between gap-4"><div><h2 className="font-newsreader text-3xl">Základní údaje</h2><p className="mt-1 font-redhat text-sm text-muted">Název vytvoří návrh SKU, adresy a SEO. Vše můžete následně upravit.</p></div>{internalId ? <p className="font-redhat text-xs text-muted" title="Neměnný databázový identifikátor">ID: <span className="font-mono">{internalId}</span></p> : null}</div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className={labelClass}>Název produktu<input className={inputClass} name="cs.name" onChange={(event) => { setName(event.target.value); if (autoSeoTitle) setSeoTitle(defaultSeoTitle(event.target.value)); }} required value={name} /></label>
          <label className={labelClass}>Kategorie<select className={inputClass} defaultValue={initial.category} name="category">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className={labelClass}>
            <span className="flex items-center justify-between gap-2">Kód produktu <button className="inline-flex items-center gap-1 text-xs text-ruby" onClick={() => setAutoSku(true)} type="button"><RefreshCw size={13} />Navrhnout znovu</button></span>
            <input className={inputClass} inputMode="numeric" name="sku" onChange={(event) => { setAutoSku(false); setSku(event.target.value.replace(/\D/g, "")); }} pattern="\d+" required value={sku} />
            <span className={`text-xs ${availability.skuAvailable ? "text-emerald-700" : "text-red-700"}`}>{availability.checking ? "Ověřuji…" : availability.skuAvailable ? "SKU je dostupné" : "SKU již používá jiný produkt"}</span>
          </label>
          <label className={labelClass}>
            <span className="flex items-center justify-between gap-2">Slug <button className="inline-flex items-center gap-1 text-xs text-ruby" onClick={() => setAutoSlug(true)} type="button"><RefreshCw size={13} />Navrhnout znovu</button></span>
            <input className={inputClass} name="cs.slug" onChange={(event) => { setAutoSlug(false); setSlug(event.target.value); }} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={slug} />
            <span className={`text-xs ${availability.slugAvailable ? "text-emerald-700" : "text-red-700"}`}>{availability.checking ? "Ověřuji…" : availability.slugAvailable ? "Adresa je dostupná" : "Adresu již používá jiný produkt"}</span>
          </label>
        </div>
        <div className="mt-5 border border-line bg-blush/40 px-4 py-3 font-redhat text-sm"><span className="font-semibold">Náhled URL:</span> <span className="break-all text-ruby">https://amaree.cz/cs/produkt/{slug || "nazev-produktu"}</span></div>
      </section>

      <section className={`${visible("description")} ${panelClass}`} role="tabpanel">
        <SectionHeading title="Popis produktu" description="Čeština je základ. Pro aktivní prodej na Slovensku zkontrolujte také slovenský název, popisy a slug; nový koncept je dočasně předvyplní z češtiny." />
        <LocaleTabs locale={locale} setLocale={setLocale} />
        {locales.map((item) => {
          const value = initial.translations[item];
          return <fieldset className={locale === item ? "mt-6 grid gap-5" : "hidden"} key={item}>
            <legend className="sr-only">{localeLabels[item]}</legend>
            {item !== "cs" ? <div className="grid gap-5 md:grid-cols-2"><label className={labelClass}>Název<input className={inputClass} defaultValue={value.name} name={`${item}.name`} /></label><label className={labelClass}>Slug<input className={inputClass} defaultValue={value.slug} name={`${item}.slug`} /></label></div> : null}
            <label className={labelClass}>Krátký popis<textarea className={`${inputClass} min-h-28`} defaultValue={item === "cs" ? undefined : value.shortDescription} name={`${item}.shortDescription`} onChange={item === "cs" ? (event) => { setShortDescription(event.target.value); if (autoSeoDescription) setSeoDescription(defaultSeoDescription(event.target.value)); } : undefined} value={item === "cs" ? shortDescription : undefined} /></label>
            <label className={labelClass}>Dlouhý popis<textarea className={`${inputClass} min-h-64`} defaultValue={value.longDescription} name={`${item}.longDescription`} /></label>
          </fieldset>;
        })}
      </section>

      <section className={`${visible("photos")} ${panelClass}`} role="tabpanel">
        {productId ? <ProductImages defaultAlt={{ cs: name, sk: initial.translations.sk.name || name, en: initial.translations.en.name || name, de: initial.translations.de.name || name }} initialImages={initialImages} key={initialImages.map((image) => `${image.id}:${image.alt.cs}`).join(":")} onCountChange={(count) => { setImageCount(count); updateReadiness(count); }} onNotice={(text) => notify({ type: "success", text })} productId={productId} /> : <NewProductImages drafts={imageDrafts} error={imageError} onChange={(drafts) => { setImageDrafts(drafts); changed(drafts.length); }} onError={setImageError} />}
      </section>

      <section className={`${visible("price")} ${panelClass}`} role="tabpanel">
        <SectionHeading title="Cena a sklad" description="Nulová zásoba je platný stav vyprodaného produktu. Pole ale musí být vyplněné." />
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <label className={labelClass}>Cena CZK<input className={inputClass} defaultValue={major(initial.prices.CZK.amountMinor)} min="0" name="priceCzk" required step="0.01" type="number" /></label>
          <label className={labelClass}>Původní cena CZK<input className={inputClass} defaultValue={major(initial.prices.CZK.originalAmountMinor)} min="0" name="originalPriceCzk" step="0.01" type="number" /></label>
          <label className={labelClass}>Skladová zásoba<input className={inputClass} defaultValue={initial.stockQuantity} min="0" name="stockQuantity" required step="1" type="number" /></label>
          <label className={labelClass}>Cena EUR<input className={inputClass} defaultValue={major(initial.prices.EUR.amountMinor)} min="0" name="priceEur" required step="0.01" type="number" /></label>
          <label className={labelClass}>Původní cena EUR<input className={inputClass} defaultValue={major(initial.prices.EUR.originalAmountMinor)} min="0" name="originalPriceEur" step="0.01" type="number" /></label>
          <label className={labelClass}>Upozornit při zásobě<input className={inputClass} defaultValue={initial.lowStockThreshold} min="0" name="lowStockThreshold" required step="1" type="number" /></label>
        </div>
      </section>

      <section className={`${visible("seo")} ${panelClass}`} role="tabpanel">
        <SectionHeading title="SEO" description="Nevyplněné české údaje se automaticky připravují z názvu a krátkého popisu." />
        <LocaleTabs locale={locale} setLocale={setLocale} />
        {locales.map((item) => {
          const value = initial.translations[item];
          return <fieldset className={locale === item ? "mt-6 grid gap-5" : "hidden"} key={item}>
            <label className={labelClass}>SEO title<input className={inputClass} defaultValue={item === "cs" ? undefined : value.seoTitle} maxLength={70} name={`${item}.seoTitle`} onChange={item === "cs" ? (event) => { setAutoSeoTitle(false); setSeoTitle(event.target.value); } : undefined} value={item === "cs" ? seoTitle : undefined} /></label>
            <label className={labelClass}>SEO description<textarea className={`${inputClass} min-h-28`} defaultValue={item === "cs" ? undefined : value.seoDescription} maxLength={170} name={`${item}.seoDescription`} onChange={item === "cs" ? (event) => { setAutoSeoDescription(false); setSeoDescription(event.target.value); } : undefined} value={item === "cs" ? seoDescription : undefined} /></label>
            {item === "cs" ? <div className="border border-line bg-blush/40 p-4"><p className="font-redhat text-xs text-muted">Náhled výsledku vyhledávání</p><p className="mt-2 font-redhat text-lg font-semibold text-ruby">{seoTitle || name}</p><p className="mt-1 font-redhat text-sm leading-6 text-muted">{seoDescription || shortDescription}</p></div> : null}
          </fieldset>;
        })}
      </section>

      <section className={`${visible("parameters")} ${panelClass}`} role="tabpanel">
        <SectionHeading title="Parametry" description="Rozměry a hmotnost se zobrazují v tabulce parametrů na veřejném detailu produktu." />
        <LocaleTabs locale={locale} setLocale={setLocale} />
        {locales.map((item) => {
          const value = initial.translations[item];
          return <fieldset className={locale === item ? "mt-6 grid gap-5" : "hidden"} key={item}>
            <div className="border border-line bg-blush/40 p-5">
              <label className={labelClass}>
                <span className="flex items-center gap-2"><Ruler aria-hidden="true" className="text-ruby" size={19} strokeWidth={1.7} />Rozměry produktu</span>
                <input className={inputClass} defaultValue={value.dimensions} name={`${item}.dimensions`} placeholder="např. délka 16–19 cm, motiv 12 × 12 mm" />
                <span className="font-normal text-xs text-muted">Uveďte všechny rozměry důležité pro výběr správné velikosti.</span>
              </label>
            </div>
            <div className="grid gap-5 md:grid-cols-3"><label className={labelClass}>Materiál<input className={inputClass} defaultValue={value.material} name={`${item}.material`} /></label><label className={labelClass}>Barva<input className={inputClass} defaultValue={value.color} name={`${item}.color`} /></label><label className={labelClass}>Typ zapínání<input className={inputClass} defaultValue={value.clasp} name={`${item}.clasp`} placeholder="např. karabinka" /></label></div>
            <label className={labelClass}>Kameny / dekorativní prvky<input className={inputClass} defaultValue={value.stones} name={`${item}.stones`} /></label>
            <label className={labelClass}>Péče o šperk<textarea className={`${inputClass} min-h-32`} defaultValue={value.care} name={`${item}.care`} /></label>
          </fieldset>;
        })}
        <div className="mt-8 border border-line bg-blush/40 p-5">
          <label className={labelClass}>
            <span className="flex items-center gap-2"><Scale aria-hidden="true" className="text-ruby" size={19} strokeWidth={1.7} />Hmotnost produktu (g)</span>
            <input className={inputClass} defaultValue={initial.weightGrams ?? ""} min="0.001" name="weightGrams" placeholder="např. 3,25" step="0.001" type="number" />
            <span className="font-normal text-xs text-muted">Volitelná celková hmotnost jednoho produktu v gramech. Platí pro všechny jazykové verze.</span>
          </label>
        </div>
        <label className={`${labelClass} mt-5`}>Stylové štítky<input className={inputClass} name="styleTags" onChange={(event) => setStyleTags(event.target.value)} placeholder="jemný, romantický, minimalistický" value={styleTags} /><span className="font-normal text-xs text-muted">Oddělujte čárkou. Slouží pro budoucí filtrování katalogu a nic se nepublikuje automaticky.</span></label>
      </section>

      <section className={`${visible("publishing")} ${panelClass}`} role="tabpanel">
        <SectionHeading title="Publikování" description="Veřejný e-shop zobrazuje pouze aktivní produkty. Skryté a archivované zůstávají dostupné jen v administraci." />
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className={labelClass}>Stav<select className={inputClass} defaultValue={initial.publicationStatus} name="publicationStatus">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className={labelClass}>Pořadí ve výpisu<input className={inputClass} defaultValue={initial.sortOrder} name="sortOrder" required step="1" type="number" /></label>
        </div>
        <div className="mt-5 flex flex-wrap gap-5 font-redhat text-sm font-semibold"><label className="flex items-center gap-2"><input defaultChecked={initial.featured} name="featured" type="checkbox" /> Doporučený produkt</label><label className="flex items-center gap-2"><input defaultChecked={initial.isNew} name="isNew" type="checkbox" /> Novinka</label></div>
        <div className={`mt-7 border p-4 ${missing.length ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
          <p className="flex items-center gap-2 font-redhat text-sm font-semibold">{missing.length ? <Archive className="text-amber-700" size={18} /> : <CheckCircle2 className="text-emerald-700" size={18} />}{missing.length ? "Před aktivací ještě doplňte:" : "Produkt splňuje základní podmínky pro publikování."}</p>
          {missing.length ? <ul className="mt-3 grid gap-1 font-redhat text-sm text-amber-900">{missing.map((item) => <li key={item}>• {item}</li>)}</ul> : null}
        </div>
      </section>

      <div className="sticky bottom-0 z-20 mt-5 flex flex-wrap items-center justify-between gap-3 border border-line bg-ivory/95 px-4 py-3 shadow-[0_-8px_30px_rgba(39,31,31,0.06)] backdrop-blur">
        <div className="flex items-center gap-3"><span className={`h-2 w-2 rounded-full ${dirty ? "bg-amber-500" : "bg-emerald-600"}`} /><span className="font-redhat text-xs text-muted">{dirty ? "Čeká na uložení" : "Vše uloženo"}</span>{productId ? <button className="inline-flex min-h-10 items-center gap-2 border border-line bg-white px-3 font-redhat text-sm font-semibold" disabled={saving} onClick={duplicate} type="button"><Copy size={16} />Duplikovat</button> : null}</div>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-brand bg-ruby px-6 font-redhat text-sm font-semibold text-white disabled:opacity-50" disabled={saving} type="submit">{saving ? <LoaderCircle className="animate-spin" size={18} /> : <Save size={18} />}{productId ? "Uložit produkt" : "Vytvořit produkt"}<span className="hidden text-xs font-normal opacity-75 sm:inline">Ctrl+S</span></button>
      </div>

      {toast ? <div aria-live="polite" className={`fixed bottom-5 right-5 z-50 max-w-sm border px-4 py-3 font-redhat text-sm font-semibold shadow-lg ${toast.type === "error" ? "border-red-200 bg-red-50 text-red-800" : toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-line bg-white text-ink"}`} role={toast.type === "error" ? "alert" : "status"}>{toast.text}</div> : null}
    </form>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div><h2 className="font-newsreader text-3xl">{title}</h2><p className="mt-1 max-w-3xl font-redhat text-sm leading-6 text-muted">{description}</p></div>;
}

function LocaleTabs({ locale, setLocale }: { locale: (typeof locales)[number]; setLocale: (locale: (typeof locales)[number]) => void }) {
  return <div className="mt-5 inline-flex border border-line bg-white p-1" role="tablist" aria-label="Jazyk produktu">{locales.map((item) => <button aria-selected={locale === item} className={`min-h-10 px-4 font-redhat text-sm font-semibold ${locale === item ? "bg-ruby text-white" : "text-ink"}`} key={item} onClick={() => setLocale(item)} role="tab" type="button">{localeLabels[item]}</button>)}</div>;
}
