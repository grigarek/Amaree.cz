"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { maxProductImageFileSize } from "@/lib/images/upload-limits";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function AboutImageInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState("");
  const [fileInfo, setFileInfo] = useState("");
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);

  async function validate(file: File | undefined) {
    if (!file) {
      setFilename("");
      setFileInfo("");
      setError("");
      return;
    }
    if (!acceptedTypes.has(file.type)) {
      if (inputRef.current) inputRef.current.value = "";
      setFilename("");
      setFileInfo("");
      setError("Použijte fotografii JPG, PNG nebo WebP.");
      return;
    }
    if (file.size > maxProductImageFileSize) {
      if (inputRef.current) inputRef.current.value = "";
      setFilename("");
      setFileInfo("");
      setError("Fotografie může mít nejvýše 12 MB.");
      return;
    }

    setPreparing(true);
    setError("");
    try {
      const prepared = await prepareAboutImage(file);
      if (inputRef.current && prepared !== file) {
        const transfer = new DataTransfer();
        transfer.items.add(prepared);
        inputRef.current.files = transfer.files;
      }
      setFilename(prepared.name);
      setFileInfo(`${formatBytes(prepared.size)} · připraveno pro rychlé nahrání`);
    } catch {
      setFilename(file.name);
      setFileInfo(`${formatBytes(file.size)} · nahraje se původní soubor`);
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="mt-4 grid gap-2 font-redhat text-sm">
      <span className="font-semibold">Nová fotografie</span>
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 border border-ruby bg-white px-4 font-semibold text-ruby transition hover:bg-blush"
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <ImagePlus size={18} />
        Vybrat fotografii
      </button>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        name="aboutImage"
        onChange={(event) => void validate(event.target.files?.[0])}
        ref={inputRef}
        type="file"
      />
      <span className="text-xs font-normal text-muted">JPG, PNG nebo WebP, nejvýše 12 MB.</span>
      {preparing ? <span className="text-xs font-semibold text-ruby" role="status">Připravuji fotografii pro web…</span> : null}
      {filename && !preparing ? <span className="break-all text-xs font-semibold text-ink">Vybráno: {filename}<span className="mt-1 block font-normal text-muted">{fileInfo}</span></span> : null}
      {error ? <span className="text-xs font-semibold text-red-700" role="alert">{error}</span> : null}
    </div>
  );
}

const maxAboutImageEdge = 2400;

async function prepareAboutImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxAboutImageEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  // Malé fotografie už není potřeba znovu komprimovat.
  if (scale === 1 && file.size <= 1_500_000) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    bitmap.close();
    return file;
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.92));
  if (!blob || blob.size >= file.size) return file;
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: file.lastModified });
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
