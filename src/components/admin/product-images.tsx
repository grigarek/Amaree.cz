"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, GripVertical, ImagePlus, LoaderCircle, Save, Star, Trash2, Upload } from "lucide-react";
import type { AdminProductImage } from "@/lib/admin/products";

export function ProductImages({ productId, initialImages, defaultAlt, onCountChange, onNotice }: {
  productId: string;
  initialImages: AdminProductImage[];
  defaultAlt: { cs: string; sk: string; en: string; de: string };
  onCountChange?: (count: number) => void;
  onNotice?: (message: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState(initialImages);
  const [files, setFiles] = useState<File[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function selectFiles(selected: FileList | null) {
    if (!selected) return;
    const next = Array.from(selected).slice(0, 12);
    if (images.length + next.length > 12) {
      setError(`K produktu lze přidat ještě nejvýše ${Math.max(0, 12 - images.length)} fotografií.`);
      return;
    }
    setFiles(next);
    setError("");
  }

  async function upload() {
    if (!files.length) return;
    setBusy(true);
    setError("");
    const data = new FormData();
    files.forEach((file) => data.append("files", file));
    data.set("altCs", defaultAlt.cs);
    data.set("altSk", defaultAlt.sk);
    data.set("altEn", defaultAlt.en);
    data.set("altDe", defaultAlt.de);
    try {
      const response = await fetch(`/api/admin/products/${productId}/images`, { method: "POST", body: data });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Nahrání se nezdařilo.");
      setFiles([]);
      onCountChange?.(images.length + files.length);
      onNotice?.("Fotografie byly nahrány.");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Nahrání se nezdařilo.");
    } finally {
      setBusy(false);
    }
  }

  async function persistOrder(next: AdminProductImage[], primaryId: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${productId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: next.map((image) => image.id), primaryId })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Pořadí se nepodařilo uložit.");
      setImages(next.map((image, index) => ({ ...image, sortOrder: index, isPrimary: image.id === primaryId })));
      onNotice?.("Pořadí fotografií bylo uloženo.");
      router.refresh();
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : "Pořadí se nepodařilo uložit.");
    } finally {
      setBusy(false);
    }
  }

  function moveImage(imageId: string, direction: -1 | 1) {
    const from = images.findIndex((image) => image.id === imageId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void persistOrder(next, next.find((image) => image.isPrimary)?.id ?? next[0].id);
  }

  async function editImage(imageId: string, action: "archive" | "delete") {
    if (action === "delete" && !window.confirm("Opravdu trvale smazat fotografii ze Storage?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Fotografii se nepodařilo upravit.");
      setImages((current) => current.filter((image) => image.id !== imageId));
      onCountChange?.(Math.max(0, images.length - 1));
      onNotice?.(action === "delete" ? "Fotografie byla smazána." : "Fotografie byla archivována.");
      router.refresh();
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : "Fotografii se nepodařilo upravit.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAlt(imageId: string, alt: AdminProductImage["alt"]) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "ALT texty se nepodařilo uložit.");
      setImages((current) => current.map((image) => image.id === imageId ? { ...image, alt } : image));
      onNotice?.("Alternativní text byl uložen.");
    } catch (altError) {
      setError(altError instanceof Error ? altError.message : "ALT texty se nepodařilo uložit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="product-images">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-redhat text-sm font-semibold uppercase tracking-[0.16em] text-ruby">Supabase Storage</p><h2 className="mt-2 font-newsreader text-4xl">Fotografie produktu</h2></div>
        <p className="max-w-xl font-redhat text-sm leading-6 text-muted">JPG, PNG nebo WebP, nejvýše 12 MB a minimálně 800 × 800 px. Pořadí změníte přetažením nebo šipkami.</p>
      </div>

      <div
        className="mt-6 grid min-h-36 place-items-center border border-dashed border-ruby bg-white px-5 py-8 text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); selectFiles(event.dataTransfer.files); }}
      >
        <ImagePlus className="text-ruby" size={30} strokeWidth={1.4} />
        <p className="mt-3 font-redhat text-sm font-semibold">Přetáhněte fotografie sem</p>
        <button className="mt-3 font-redhat text-sm font-semibold text-ruby" onClick={() => inputRef.current?.click()} type="button">nebo je vyberte z počítače</button>
        <input accept="image/jpeg,image/png,image/webp" className="sr-only" multiple onChange={(event) => selectFiles(event.target.files)} ref={inputRef} type="file" />
      </div>
      {files.length ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="font-redhat text-sm">Vybráno: {files.map((file) => file.name).join(", ")}</p><button className="inline-flex min-h-11 items-center gap-2 rounded-brand bg-ruby px-5 font-redhat text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={upload} type="button">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <Upload size={18} />}Nahrát</button></div> : null}

      {images.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{images.map((image, index) => (
        <article
          className="border border-line bg-white"
          draggable={!busy}
          key={image.id}
          onDragStart={() => setDraggedId(image.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (!draggedId || draggedId === image.id) return;
            const next = [...images];
            const from = next.findIndex((item) => item.id === draggedId);
            const to = next.findIndex((item) => item.id === image.id);
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            setDraggedId(null);
            void persistOrder(next, next.find((item) => item.isPrimary)?.id ?? next[0].id);
          }}
        >
          <div className="relative aspect-[4/3] bg-blush"><Image alt={image.alt.cs} className="object-cover" fill sizes="(min-width: 1024px) 30vw, 50vw" src={image.url} /></div>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 font-redhat text-xs font-semibold text-muted"><GripVertical size={16} />Pořadí {index + 1} · {image.width} × {image.height}</span>
              {image.isPrimary ? <span className="inline-flex items-center gap-1 font-redhat text-xs font-semibold text-ruby"><Star size={15} fill="currentColor" />Hlavní</span> : null}
            </div>
            <p className="mt-3 truncate font-redhat text-sm font-semibold" title={image.filename}>{image.filename}</p>
            <ImageAltEditor alt={image.alt} busy={busy} onSave={(alt) => saveAlt(image.id, alt)} />
            <div className="mt-4 flex items-center gap-1">
              <button aria-label="Posunout fotografii doleva" className="p-2 text-ink hover:text-ruby disabled:cursor-not-allowed disabled:opacity-30" disabled={busy || index === 0} onClick={() => moveImage(image.id, -1)} title="Posunout doleva" type="button"><ChevronLeft size={18} /></button>
              <button aria-label="Posunout fotografii doprava" className="p-2 text-ink hover:text-ruby disabled:cursor-not-allowed disabled:opacity-30" disabled={busy || index === images.length - 1} onClick={() => moveImage(image.id, 1)} title="Posunout doprava" type="button"><ChevronRight size={18} /></button>
              {!image.isPrimary ? <button aria-label="Nastavit jako hlavní" className="p-2 text-ink hover:text-ruby" onClick={() => persistOrder(images, image.id)} title="Nastavit jako hlavní" type="button"><Star size={18} /></button> : null}
              <button aria-label="Archivovat fotografii" className="p-2 text-ink hover:text-ruby" onClick={() => editImage(image.id, "archive")} title="Archivovat" type="button"><Archive size={18} /></button>
              <button aria-label="Trvale smazat fotografii" className="p-2 text-ink hover:text-red-700" onClick={() => editImage(image.id, "delete")} title="Trvale smazat" type="button"><Trash2 size={18} /></button>
            </div>
          </div>
        </article>
      ))}</div> : <p className="mt-6 font-redhat text-sm text-muted">Produkt zatím nemá žádnou fotografii a nemůže být připraven k aktivaci.</p>}
      {error ? <p className="mt-4 font-redhat text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
    </section>
  );
}

function ImageAltEditor({ alt, busy, onSave }: { alt: AdminProductImage["alt"]; busy: boolean; onSave: (alt: AdminProductImage["alt"]) => Promise<void> }) {
  const [values, setValues] = useState(alt);
  return (
    <div className="mt-3 grid gap-2">
      {(["cs", "sk", "en", "de"] as const).map((locale) => <label className="grid grid-cols-[2rem_1fr] items-center gap-2 font-redhat text-xs" key={locale}><span className="font-semibold uppercase text-ruby">{locale}</span><input className="min-h-9 border border-line px-2" minLength={3} onChange={(event) => setValues((current) => ({ ...current, [locale]: event.target.value }))} value={values[locale]} /></label>)}
      <button className="inline-flex min-h-9 items-center justify-center gap-2 border border-line font-redhat text-xs font-semibold disabled:opacity-50" disabled={busy || Object.values(values).some((value) => value.trim().length < 3)} onClick={() => onSave(values)} type="button"><Save size={15} />Uložit ALT</button>
    </div>
  );
}
