"use client";

import Image from "next/image";
import { Check, Gift, Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { getGiftCardColor, getGiftCardPrice, giftCardDesigns, type GiftCardDesignId } from "@/lib/gift-cards";
import { formatMoney } from "@/lib/money";

export function GiftCardSelector({ locale, selectedId, onSelect }: { locale: Locale; selectedId: GiftCardDesignId | null; onSelect: (id: GiftCardDesignId | null) => void }) {
  const t = useTranslations("cart");
  const [previewId, setPreviewId] = useState<GiftCardDesignId | null>(null);
  const currency = locale === "sk" ? "EUR" : "CZK";
  const selected = giftCardDesigns.find((design) => design.id === selectedId);
  const preview = giftCardDesigns.find((design) => design.id === previewId);

  useEffect(() => {
    if (!previewId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewId]);

  return (
    <section aria-labelledby="gift-card-title" className="rounded-brand border border-ruby/25 bg-blush/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-redhat text-base font-semibold" id="gift-card-title">
            <Gift aria-hidden="true" className="text-ruby" size={18} />
            {t("giftCardTitle")}
          </h3>
          <p className="mt-1 font-redhat text-xs leading-5 text-muted">{t("giftCardDescription")}</p>
        </div>
        <span className="shrink-0 rounded-full bg-ruby px-2.5 py-1 font-redhat text-xs font-semibold text-white">
          {formatMoney(getGiftCardPrice(currency), locale, currency)}
        </span>
      </div>

      {selected ? (
        <div className="mt-3 flex items-center gap-3 rounded-brand border border-ruby/30 bg-blush/50 p-2.5">
          <button aria-label={t("giftCardPreview", { name: selected.message })} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-brand bg-white" onClick={() => setPreviewId(selected.id)} type="button">
            <Image alt={selected.message} className="object-cover" fill sizes="56px" src={selected.imageUrl} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-redhat text-sm font-semibold">{selected.message}</p>
            <p className="font-redhat text-xs text-muted">{getGiftCardColor(selected.color, locale)} · {formatMoney(getGiftCardPrice(currency), locale, currency)}</p>
          </div>
          <button aria-label={t("giftCardRemove")} className="rounded-brand p-2 text-muted transition hover:text-ruby" onClick={() => onSelect(null)} type="button"><X size={17} /></button>
        </div>
      ) : null}

      <p className="mt-4 font-redhat text-xs font-semibold uppercase tracking-widest text-ruby">{t("giftCardSingleChoice")}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
        {giftCardDesigns.map((design) => {
          const active = selectedId === design.id;
          return (
            <div className={`relative overflow-hidden rounded-brand border bg-white transition ${active ? "border-ruby ring-2 ring-ruby/25" : "border-line hover:border-ruby/60"}`} key={design.id}>
              <button aria-pressed={active} aria-label={t("giftCardSelect", { name: design.message })} className="block w-full text-left" onClick={() => onSelect(active ? null : design.id)} type="button">
                <span className="relative block aspect-square overflow-hidden bg-white">
                  <Image alt={design.message} className="object-cover" fill sizes="(max-width: 440px) 50vw, 180px" src={design.imageUrl} />
                </span>
                <span className="block min-h-12 px-2 py-2 font-redhat text-[11px] font-semibold leading-4">{design.message}</span>
              </button>
              <button aria-label={t("giftCardPreview", { name: design.message })} className="absolute right-2 top-2 rounded-full border border-line bg-white/95 p-2 text-ink shadow-sm transition hover:text-ruby" onClick={() => setPreviewId(design.id)} type="button"><Maximize2 size={15} /></button>
              {active ? <span className="absolute left-2 top-2 rounded-full bg-ruby p-1.5 text-white"><Check size={14} /></span> : null}
            </div>
          );
        })}
      </div>

      {preview ? (
        <div aria-label={t("giftCardPreview", { name: preview.message })} aria-modal="true" className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-4" onClick={() => setPreviewId(null)} role="dialog">
          <div className="relative w-full max-w-xl rounded-brand bg-white p-3 shadow-soft" onClick={(event) => event.stopPropagation()}>
            <button aria-label={t("giftCardClosePreview")} className="absolute right-5 top-5 z-10 rounded-full border border-line bg-white p-2 shadow-sm" onClick={() => setPreviewId(null)} type="button"><X size={20} /></button>
            <div className="relative aspect-square overflow-hidden rounded-brand bg-white">
              <Image alt={preview.message} className="object-contain" fill priority sizes="(max-width: 640px) 92vw, 560px" src={preview.imageUrl} />
            </div>
            <p className="px-2 pb-2 pt-3 text-center font-redhat text-sm font-semibold">{preview.message} · {getGiftCardColor(preview.color, locale)}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
