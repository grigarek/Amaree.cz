"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Star, Trash2 } from "lucide-react";
import { maxProductImageBatchSize, maxProductImageFileSize, validateProductImageBatch } from "@/lib/images/upload-limits";

export type NewProductImageDraft = {
  id: string;
  file: File;
  previewUrl: string;
  alt: { cs: string; sk: string; en: string; de: string };
};

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function NewProductImages({
  drafts,
  error,
  onChange,
  onError
}: {
  drafts: NewProductImageDraft[];
  error: string;
  onChange: (drafts: NewProductImageDraft[]) => void;
  onError: (error: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const draftsRef = useRef(drafts);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => () => {
    draftsRef.current.forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
  }, []);

  function selectFiles(selected: FileList | null) {
    if (!selected?.length) return;
    const files = Array.from(selected);
    const combinedFiles = [...drafts.map((draft) => draft.file), ...files];

    if (combinedFiles.length > 12) {
      onError("K produktu lze přidat nejvýše 12 fotografií.");
      return;
    }
    if (files.some((file) => !acceptedTypes.has(file.type))) {
      onError("Použijte pouze fotografie JPG, PNG nebo WebP.");
      return;
    }
    try {
      validateProductImageBatch(combinedFiles);
    } catch (validationError) {
      onError(validationError instanceof Error ? validationError.message : "Fotografie nejsou platné.");
      return;
    }

    onError("");
    onChange([
      ...drafts,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        alt: { cs: "", sk: "", en: "", de: "" }
      }))
    ]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(id: string) {
    const removed = drafts.find((draft) => draft.id === id);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    onChange(drafts.filter((draft) => draft.id !== id));
  }

  function move(id: string, direction: -1 | 1) {
    const from = drafts.findIndex((draft) => draft.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= drafts.length) return;
    const next = [...drafts];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function updateAlt(id: string, locale: "cs" | "sk" | "en" | "de", value: string) {
    onChange(drafts.map((draft) => draft.id === id ? { ...draft, alt: { ...draft.alt, [locale]: value } } : draft));
  }

  const totalSize = drafts.reduce((sum, draft) => sum + draft.file.size, 0);

  return (
    <section id="new-product-images">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-redhat text-xs font-semibold uppercase tracking-[0.16em] text-ruby">Součást vytvoření produktu</p>
          <h2 className="mt-1 font-newsreader text-3xl">Fotografie a pořadí</h2>
        </div>
        <p className="max-w-xl font-redhat text-sm leading-6 text-muted">
          První fotografie bude hlavní. JPG, PNG nebo WebP, minimálně 800 × 800 px, nejvýše 12 MB na snímek.
        </p>
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

      {drafts.length ? (
        <>
          <div className="mt-4 flex flex-wrap justify-between gap-3 font-redhat text-xs text-muted">
            <span>{drafts.length} / 12 fotografií</span>
            <span>{(totalSize / 1024 / 1024).toFixed(1)} / {maxProductImageBatchSize / 1024 / 1024} MB</span>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft, index) => (
              <article
                className="border border-line bg-white"
                draggable
                key={draft.id}
                onDragStart={() => setDraggedId(draft.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!draggedId || draggedId === draft.id) return;
                  const next = [...drafts];
                  const from = next.findIndex((item) => item.id === draggedId);
                  const to = next.findIndex((item) => item.id === draft.id);
                  const [moved] = next.splice(from, 1);
                  next.splice(to, 0, moved);
                  setDraggedId(null);
                  onChange(next);
                }}
              >
                <div className="relative aspect-[4/3] bg-blush">
                  <Image alt={draft.alt.cs || draft.file.name} className="object-cover" fill sizes="(min-width: 1024px) 30vw, 50vw" src={draft.previewUrl} unoptimized />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-redhat text-xs font-semibold text-muted"><GripVertical size={16} />Pořadí {index + 1}</span>
                    {index === 0 ? <span className="inline-flex items-center gap-1 font-redhat text-xs font-semibold text-ruby"><Star fill="currentColor" size={15} />Hlavní</span> : null}
                  </div>
                  <p className="mt-3 truncate font-redhat text-sm font-semibold" title={draft.file.name}>{draft.file.name}</p>
                  <p className="mt-1 font-redhat text-xs text-muted">{(draft.file.size / 1024 / 1024).toFixed(1)} MB z max. {maxProductImageFileSize / 1024 / 1024} MB</p>
                  <label className="mt-3 grid gap-2 font-redhat text-xs">
                    <span className="font-semibold text-ruby">Alternativní text fotografie (CS)</span>
                    <input
                      className="min-h-9 border border-line px-2"
                      onChange={(event) => updateAlt(draft.id, "cs", event.target.value)}
                      placeholder="Doplní se názvem produktu"
                      value={draft.alt.cs}
                    />
                  </label>
                  <div className="mt-4 flex items-center gap-1">
                    <button aria-label="Posunout fotografii doleva" className="p-2 hover:text-ruby disabled:opacity-30" disabled={index === 0} onClick={() => move(draft.id, -1)} title="Posunout doleva" type="button"><ChevronLeft size={18} /></button>
                    <button aria-label="Posunout fotografii doprava" className="p-2 hover:text-ruby disabled:opacity-30" disabled={index === drafts.length - 1} onClick={() => move(draft.id, 1)} title="Posunout doprava" type="button"><ChevronRight size={18} /></button>
                    <button aria-label="Odebrat fotografii" className="ml-auto p-2 hover:text-red-700" onClick={() => remove(draft.id)} title="Odebrat" type="button"><Trash2 size={18} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : <p className="mt-4 font-redhat text-sm text-muted">Přidejte alespoň jednu produktovou fotografii.</p>}

      {error ? <p className="mt-4 font-redhat text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
    </section>
  );
}
