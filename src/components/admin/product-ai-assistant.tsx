"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, LoaderCircle, Sparkles, X } from "lucide-react";
import type { NewProductImageDraft } from "@/components/admin/new-product-images";
import type { AdminProductImage } from "@/lib/admin/products";
import {
  defaultProductAiFields,
  productAiFieldLabels,
  type ProductAiField,
  type ProductAiOutput,
  type ProductAiRequest
} from "@/lib/ai/product-assistant";
import { fetchAndPrepareProductImageForAi, prepareProductImageForAi } from "@/lib/images/prepare-ai-image";

export type ProductAiSnapshot = ProductAiRequest["facts"];

const categoryLabels = { necklaces: "Náhrdelníky", earrings: "Náušnice", bracelets: "Náramky" };
const allFields = Object.keys(productAiFieldLabels) as ProductAiField[];

function suggestionValue(field: ProductAiField, output: ProductAiOutput) {
  if (field === "categorySuggestion") return output.categorySuggestion.categoryName;
  if (field === "colors") return output.colors.join(", ");
  if (field === "tags") return output.tags.join(", ");
  if (field === "imageAltTexts") return output.imageAltTexts.map((item) => item.altText).join("\n");
  if (field === "dimensions" || field === "clasp") {
    const translations = (["cs", "sk", "en", "de"] as const)
      .map((locale) => ({ locale, value: output.localizedParameters[locale][field].trim() }));
    if (!translations.some((translation) => translation.value)) return "";
    return translations.map(({ locale, value }) => `${locale.toUpperCase()}: ${value}`).join("\n");
  }
  return output[field];
}

function currentValue(field: ProductAiField, snapshot: ProductAiSnapshot, images: Array<AdminProductImage | NewProductImageDraft>) {
  if (field === "name") return snapshot.name;
  if (field === "slug") return snapshot.slug;
  if (field === "skuSuggestion") return snapshot.sku;
  if (field === "shortDescription" || field === "longDescription" || field === "seoTitle" || field === "seoDescription") return snapshot.existingText[field];
  if (field === "categorySuggestion") return categoryLabels[snapshot.category];
  if (field === "colors") return snapshot.color;
  if (field === "dimensions") return snapshot.dimensions;
  if (field === "clasp") return snapshot.clasp;
  if (field === "imageAltTexts") return images.map((image) => image.alt.cs).filter(Boolean).join("\n");
  return "";
}

export function ProductAiAssistant({
  productId,
  existingImages,
  imageDrafts,
  getSnapshot,
  onApply
}: {
  productId?: string;
  existingImages: AdminProductImage[];
  imageDrafts: NewProductImageDraft[];
  getSnapshot: () => ProductAiSnapshot | null;
  onApply: (output: ProductAiOutput, fields: ProductAiField[]) => Promise<void>;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<ProductAiField>>(() => new Set(defaultProductAiFields));
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [proposal, setProposal] = useState<ProductAiOutput | null>(null);
  const [proposalSnapshot, setProposalSnapshot] = useState<ProductAiSnapshot | null>(null);
  const [acceptedFields, setAcceptedFields] = useState<Set<ProductAiField>>(new Set());
  const requestInFlight = useRef(false);
  const sourceImages = useMemo(() => imageDrafts.length ? imageDrafts : existingImages, [existingImages, imageDrafts]);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/products/ai")
      .then((response) => response.json() as Promise<{ available?: boolean }>)
      .then((result) => { if (active) setAvailable(result.available === true); })
      .catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, []);

  function toggleField(field: ProductAiField) {
    setSelectedFields((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  async function prepareImages() {
    const images: ProductAiRequest["images"] = [];
    for (const image of sourceImages.slice(0, 5)) {
      const imageUrl = "file" in image
        ? await prepareProductImageForAi(image.file)
        : await fetchAndPrepareProductImageForAi(image.url);
      images.push({ id: image.id, imageUrl });
    }
    return images;
  }

  async function generate() {
    if (requestInFlight.current) return;
    const snapshot = getSnapshot();
    if (!snapshot) {
      setError("Nejdříve zkontrolujte základní údaje produktu.");
      return;
    }
    const fields = new Set(selectedFields);
    if (!snapshot.name) fields.add("name");
    if (!snapshot.slug) fields.add("slug");
    if (!snapshot.sku) fields.add("skuSuggestion");
    if (!fields.size) {
      setError("Vyberte alespoň jedno pole, které má AI připravit.");
      return;
    }

    requestInFlight.current = true;
    setLoading(true);
    setError("");
    try {
      const images = await prepareImages();
      const response = await fetch("/api/admin/products/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: productId ?? null, fields: [...fields], facts: { ...snapshot, instructions }, images })
      });
      const result = await response.json() as { requestId?: string; output?: ProductAiOutput; error?: string };
      if (!response.ok || !result.output || !result.requestId) throw new Error(result.error ?? "Obsah se nepodařilo vygenerovat. Vaše rozpracované údaje zůstaly zachovány.");
      const nonEmpty = [...fields].filter((field) => suggestionValue(field, result.output as ProductAiOutput));
      setProposal(result.output);
      setProposalSnapshot({ ...snapshot, instructions });
      setRequestId(result.requestId);
      setAcceptedFields(new Set(nonEmpty));
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Obsah se nepodařilo vygenerovat. Vaše rozpracované údaje zůstaly zachovány.");
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  function editProposal(field: ProductAiField, value: string) {
    setProposal((current) => {
      if (!current) return current;
      if (field === "colors") return { ...current, colors: value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 6) };
      if (field === "tags") return { ...current, tags: value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8) };
      if (field === "categorySuggestion") {
        const entry = Object.entries(categoryLabels).find(([, label]) => label === value);
        return { ...current, categorySuggestion: { ...current.categorySuggestion, categoryId: (entry?.[0] as keyof typeof categoryLabels | undefined) ?? null, categoryName: value } };
      }
      if (field === "dimensions" || field === "clasp") {
        const localizedParameters = structuredClone(current.localizedParameters);
        value.split("\n").forEach((line) => {
          const match = line.match(/^\s*(CS|SK|EN|DE)\s*:\s*(.*)$/i);
          if (match) localizedParameters[match[1].toLowerCase() as keyof typeof localizedParameters][field] = match[2];
        });
        return { ...current, localizedParameters };
      }
      return { ...current, [field]: value };
    });
  }

  async function apply() {
    if (!proposal || !requestId || requestInFlight.current) return;
    const fields = [...acceptedFields];
    requestInFlight.current = true;
    setLoading(true);
    setError("");
    try {
      await onApply(proposal, fields);
      const logResponse = await fetch("/api/admin/products/ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, fields })
      });
      if (!logResponse.ok) throw new Error("Návrhy byly použity, ale jejich použití se nepodařilo zaznamenat.");
      setProposal(null);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Návrhy se nepodařilo použít.");
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <section className="mt-5 border border-line bg-blush/30 p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="flex items-center gap-2 font-redhat text-xs font-semibold uppercase tracking-[0.16em] text-ruby"><Sparkles size={16} />Volitelný nástroj</p>
          <h2 className="mt-2 font-newsreader text-3xl">AI pomocník</h2>
          <p className="mt-2 font-redhat text-sm leading-6 text-muted">Vychází jen z vyplněných údajů a nejvýše pěti zmenšených fotografií. Návrhy nic samy neukládají ani nepublikují.</p>
        </div>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-brand bg-ruby px-5 font-redhat text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={available !== true || loading} onClick={generate} type="button">
          {loading ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}{loading ? "Připravuji návrh obsahu…" : "Vygenerovat obsah"}
        </button>
      </div>

      {available === false ? <p className="mt-4 font-redhat text-sm font-semibold text-amber-800">AI pomocník momentálně není dostupný.</p> : null}
      <fieldset className="mt-6">
        <legend className="font-redhat text-sm font-semibold">Co má AI připravit</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {allFields.map((field) => <label className="flex min-h-10 items-center gap-3 border border-line bg-white px-3 font-redhat text-sm" key={field}><input checked={selectedFields.has(field)} onChange={() => toggleField(field)} type="checkbox" />{productAiFieldLabels[field]}</label>)}
        </div>
        <p className="mt-2 font-redhat text-xs text-muted">Prázdný název, SKU nebo slug se navrhne i bez zaškrtnutí. Jejich jedinečnost vždy znovu ověří server a databáze.</p>
      </fieldset>
      <label className="mt-5 grid gap-2 font-redhat text-sm font-semibold">Pokyny pro AI<textarea className="min-h-24 w-full rounded-brand border border-line bg-white px-3 py-2 font-redhat text-sm font-normal outline-none focus:border-ruby focus:ring-2 focus:ring-ruby/10" maxLength={1500} onChange={(event) => setInstructions(event.target.value)} placeholder="Např. Zdůrazni jemný vzhled a dárkové balení. Nevymýšlej materiál." value={instructions} /></label>
      <p className="mt-4 flex items-start gap-2 font-redhat text-xs leading-5 text-muted"><AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={16} />Vygenerované údaje před použitím vždy zkontrolujte. AI nesmí nahrazovat ověření materiálu, rozměrů ani dalších technických parametrů.</p>
      {error ? <p className="mt-4 font-redhat text-sm font-semibold text-red-700" role="alert">{error}</p> : null}

      {proposal && proposalSnapshot ? (
        <div aria-labelledby="ai-proposal-title" aria-modal="true" className="fixed inset-0 z-[80] overflow-y-auto bg-black/45 p-3 md:p-8" role="dialog">
          <div className="mx-auto max-w-5xl border border-line bg-ivory shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-ivory px-5 py-4 md:px-7">
              <div><p className="font-redhat text-xs font-semibold uppercase tracking-[0.16em] text-ruby">Návrh je připravený ke kontrole</p><h2 className="mt-1 font-newsreader text-3xl" id="ai-proposal-title">Porovnání obsahu</h2></div>
              <button aria-label="Zavřít náhled" className="p-2 text-ink hover:text-ruby" onClick={() => setProposal(null)} title="Zavřít" type="button"><X size={22} /></button>
            </div>
            <div className="grid gap-4 p-5 md:p-7">
              {allFields.filter((field) => suggestionValue(field, proposal)).map((field) => (
                <article className="border border-line bg-white p-4" key={field}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-redhat text-sm font-semibold text-ruby">{productAiFieldLabels[field]}</h3>
                    <div aria-label={`Volba pro ${productAiFieldLabels[field]}`} className="inline-flex border border-line bg-ivory p-1" role="group">
                      <button
                        aria-pressed={acceptedFields.has(field)}
                        className={`min-h-9 px-3 font-redhat text-xs font-semibold transition ${acceptedFields.has(field) ? "bg-ruby text-white" : "bg-transparent text-muted hover:text-ink"}`}
                        onClick={() => setAcceptedFields((current) => new Set(current).add(field))}
                        type="button"
                      >
                        Použít návrh
                      </button>
                      <button
                        aria-pressed={!acceptedFields.has(field)}
                        className={`min-h-9 px-3 font-redhat text-xs font-semibold transition ${!acceptedFields.has(field) ? "bg-white text-ink shadow-sm" : "bg-transparent text-muted hover:text-ink"}`}
                        onClick={() => setAcceptedFields((current) => { const next = new Set(current); next.delete(field); return next; })}
                        type="button"
                      >
                        Ponechat původní
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="bg-blush/45 p-3"><p className="font-redhat text-xs font-semibold uppercase text-muted">Současná hodnota</p><p className="mt-2 whitespace-pre-wrap font-redhat text-sm leading-6 text-muted">{currentValue(field, proposalSnapshot, sourceImages) || "Nevyplněno"}</p></div>
                    <label className="grid gap-2 font-redhat text-xs font-semibold uppercase text-muted">Návrh AI
                      {field === "categorySuggestion" ? <select className="min-h-11 border border-line bg-white px-3 font-redhat text-sm font-normal normal-case text-ink" onChange={(event) => editProposal(field, event.target.value)} value={suggestionValue(field, proposal)}>{Object.values(categoryLabels).map((label) => <option key={label}>{label}</option>)}</select> : <textarea className="min-h-24 border border-line bg-white px-3 py-2 font-redhat text-sm font-normal normal-case leading-6 text-ink" onChange={(event) => editProposal(field, event.target.value)} value={suggestionValue(field, proposal)} />}
                    </label>
                  </div>
                  {field === "tags" ? <p className="mt-2 font-redhat text-xs text-muted">Stylové štítky jsou nyní návrh k ruční kontrole; jejich veřejné filtrování bude doplněno až s katalogovým systémem štítků.</p> : null}
                </article>
              ))}
              {proposal.warnings.length || proposal.missingInformation.length ? <div className="border border-amber-200 bg-amber-50 p-4 font-redhat text-sm text-amber-950"><p className="font-semibold">Upozornění AI</p>{[...proposal.warnings, ...proposal.missingInformation.map((item) => `Chybí potvrzený údaj: ${item}`)].map((item) => <p className="mt-1" key={item}>• {item}</p>)}</div> : null}
            </div>
            <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-line bg-ivory px-5 py-4 md:px-7">
              <button className="min-h-11 border border-line bg-white px-5 font-redhat text-sm font-semibold" disabled={loading} onClick={() => setProposal(null)} type="button">Zrušit</button>
              <button className="inline-flex min-h-11 items-center gap-2 rounded-brand bg-ruby px-5 font-redhat text-sm font-semibold text-white disabled:opacity-50" disabled={loading || acceptedFields.size === 0} onClick={apply} type="button">{loading ? <LoaderCircle className="animate-spin" size={18} /> : <Check size={18} />}Použít všechny označené návrhy</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
