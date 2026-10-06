"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Locale, ProductImage } from "@/types/domain";

const galleryLabels = {
  cs: {
    open: "Otevřít zvětšenou fotografii",
    close: "Zavřít galerii",
    previous: "Předchozí fotografie",
    next: "Další fotografie",
    thumbnail: "Zobrazit fotografii"
  },
  sk: {
    open: "Otvoriť zväčšenú fotografiu",
    close: "Zavrieť galériu",
    previous: "Predchádzajúca fotografia",
    next: "Ďalšia fotografia",
    thumbnail: "Zobraziť fotografiu"
  },
  en: {
    open: "Open enlarged photo",
    close: "Close gallery",
    previous: "Previous photo",
    next: "Next photo",
    thumbnail: "Show photo"
  },
  de: {
    open: "Vergrößertes Foto öffnen",
    close: "Galerie schließen",
    previous: "Vorheriges Foto",
    next: "Nächstes Foto",
    thumbnail: "Foto anzeigen"
  }
} satisfies Record<Locale, Record<string, string>>;

export function ProductGallery({ images, locale }: { images: ProductImage[]; locale: Locale }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const labels = galleryLabels[locale];
  const displayedIndex = previewIndex ?? selectedIndex;
  const selectedImage = images[displayedIndex];
  const hasMultipleImages = images.length > 1;
  const thumbnailImages = Array.from(
    { length: Math.min(2, Math.max(0, images.length - 1)) },
    (_, offset) => {
      const index = (selectedIndex + offset + 1) % images.length;
      return { image: images[index], index };
    }
  );

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft" && hasMultipleImages) {
        setSelectedIndex((current) => (current - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight" && hasMultipleImages) {
        setSelectedIndex((current) => (current + 1) % images.length);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasMultipleImages, images.length, lightboxOpen]);

  if (!selectedImage) return <div className="aspect-[4/5] rounded-brand bg-blush" />;

  const selectImage = (index: number) => {
    setSelectedIndex(index);
    setPreviewIndex(null);
  };
  const showPrevious = () => selectImage((displayedIndex - 1 + images.length) % images.length);
  const showNext = () => selectImage((displayedIndex + 1) % images.length);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_clamp(96px,22%,132px)]">
        <div className="group relative aspect-[4/5] overflow-hidden rounded-brand bg-white">
          <button
            aria-label={`${labels.open}: ${selectedImage.alt[locale]}`}
            className="relative block h-full w-full cursor-zoom-in text-left"
            onClick={() => {
              selectImage(displayedIndex);
              setLightboxOpen(true);
            }}
            type="button"
          >
            <Image
              alt={selectedImage.alt[locale]}
              className={`${displayedIndex === 0 ? "object-contain" : "object-cover"} transition-transform duration-500 group-hover:scale-[1.015]`}
              fill
              loading="eager"
              priority
              sizes="(min-width: 1024px) 43vw, (min-width: 640px) 62vw, 100vw"
              src={selectedImage.url}
            />
            <span className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full border border-white/55 bg-black/20 text-white opacity-90 backdrop-blur-sm transition group-hover:bg-black/35 group-hover:opacity-100">
              <Expand aria-hidden="true" size={18} strokeWidth={1.5} />
            </span>
          </button>

          {hasMultipleImages ? (
            <>
              <button
                aria-label={labels.previous}
                className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/55 bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/35 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                onClick={showPrevious}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.5} />
              </button>
              <button
                aria-label={labels.next}
                className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/55 bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/35 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                onClick={showNext}
                type="button"
              >
                <ChevronRight aria-hidden="true" size={20} strokeWidth={1.5} />
              </button>
              <span className="absolute bottom-4 left-4 rounded-full bg-black/25 px-3 py-1 font-redhat text-[11px] font-medium text-white backdrop-blur-sm">
                {displayedIndex + 1} / {images.length}
              </span>
            </>
          ) : null}
        </div>

        {hasMultipleImages ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:grid-rows-2">
            {thumbnailImages.map(({ image, index }) => (
              <button
                aria-label={`${labels.thumbnail} ${index + 1}: ${image.alt[locale]}`}
                className="relative aspect-[4/3] overflow-hidden rounded-brand border border-transparent bg-blush opacity-75 transition hover:border-ruby hover:opacity-100 focus-visible:border-ruby focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-ruby/20 sm:aspect-auto sm:min-h-0"
                key={`${image.id}-${index}`}
                onBlur={() => setPreviewIndex(null)}
                onClick={() => selectImage(index)}
                onFocus={() => setPreviewIndex(index)}
                onMouseEnter={() => setPreviewIndex(index)}
                onMouseLeave={() => setPreviewIndex(null)}
                type="button"
              >
                <Image
                  alt=""
                  aria-hidden="true"
                  className="object-cover"
                  fill
                  sizes="(min-width: 640px) 132px, 48vw"
                  src={image.url}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {lightboxOpen ? (
        <div
          aria-label={selectedImage.alt[locale]}
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
        >
          <button
            aria-label={labels.close}
            className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white transition hover:bg-white/10 sm:right-7 sm:top-7"
            onClick={() => setLightboxOpen(false)}
            type="button"
          >
            <X aria-hidden="true" size={23} strokeWidth={1.4} />
          </button>

          {hasMultipleImages ? (
            <button
              aria-label={labels.previous}
              className="absolute left-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white transition hover:bg-white/10 sm:left-7"
              onClick={(event) => {
                event.stopPropagation();
                showPrevious();
              }}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={25} strokeWidth={1.4} />
            </button>
          ) : null}

          <div className="relative h-[82vh] w-[min(88vw,1100px)]" onClick={(event) => event.stopPropagation()}>
            <Image
              alt={selectedImage.alt[locale]}
              className="object-contain"
              fill
              priority
              sizes="90vw"
              src={selectedImage.url}
            />
          </div>

          {hasMultipleImages ? (
            <button
              aria-label={labels.next}
              className="absolute right-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white transition hover:bg-white/10 sm:right-7"
              onClick={(event) => {
                event.stopPropagation();
                showNext();
              }}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={25} strokeWidth={1.4} />
            </button>
          ) : null}

          <span className="absolute bottom-4 font-redhat text-xs font-medium text-white/70 sm:bottom-6">
            {selectedIndex + 1} / {images.length}
          </span>
        </div>
      ) : null}
    </>
  );
}
