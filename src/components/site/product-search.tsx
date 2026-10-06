"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { localizedPaths, type Locale } from "@/i18n/routing";
import { formatMoney } from "@/lib/money";

type SearchResult = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  currency: "CZK" | "EUR";
  image: { url: string; alt: string } | null;
};

export function ProductSearch({ locale, transparent }: { locale: Locale; transparent: boolean }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultQuery, setResultQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const normalizedQuery = query.trim();
  const visibleResults = resultQuery === normalizedQuery ? results : [];
  const isLoading = Boolean(normalizedQuery) && (loading || resultQuery !== normalizedQuery);

  useEffect(() => {
    if (!normalizedQuery) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(normalizedQuery)}&locale=${locale}`, { signal: controller.signal });
        const data = await response.json() as { results?: SearchResult[] };
        setResults(data.results ?? []);
        setResultQuery(normalizedQuery);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults([]);
          setResultQuery(normalizedQuery);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [locale, normalizedQuery]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  function closeSearch() {
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-controls="product-search-popover"
        aria-expanded={open}
        aria-label={open ? t("nav.close") : t("nav.search")}
        className={`p-2 transition-opacity hover:opacity-65 ${transparent ? "text-white" : "text-ink"}`}
        onClick={() => {
          if (open) closeSearch();
          else setOpen(true);
        }}
        type="button"
      >
        {open ? <X size={22} strokeWidth={1.35} /> : <Search size={22} strokeWidth={1.35} />}
      </button>

      {open ? (
        <div
          className="absolute right-[-2.9rem] top-[calc(100%+1rem)] z-[70] w-[min(23rem,calc(100vw-2rem))] rounded-brand border border-line bg-ivory p-4 text-ink shadow-soft sm:right-0 sm:p-5"
          id="product-search-popover"
          role="search"
        >
          <label className="sr-only" htmlFor="product-search-input">
            {t("search.label")}
          </label>
          <div className="flex min-h-12 items-center gap-3 rounded-brand border border-line bg-white px-3 focus-within:border-ruby focus-within:ring-1 focus-within:ring-ruby/15">
            <Search aria-hidden="true" className="shrink-0 text-ruby" size={19} strokeWidth={1.5} />
            <input
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-3 font-redhat text-sm text-ink outline-none placeholder:text-muted"
              id="product-search-input"
              inputMode="search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search.placeholder")}
              ref={inputRef}
              style={{ outline: "none" }}
              type="text"
              value={query}
            />
            {query ? (
              <button
                aria-label={t("search.clear")}
                className="p-1 text-muted transition hover:text-ruby"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                type="button"
              >
                <X size={17} strokeWidth={1.5} />
              </button>
            ) : null}
          </div>

          {!normalizedQuery ? (
            <p className="px-1 pb-1 pt-4 font-redhat text-sm leading-6 text-muted">{t("search.prompt")}</p>
          ) : isLoading ? (
            <p className="px-1 pb-1 pt-4 font-redhat text-sm leading-6 text-muted">{t("search.loading")}</p>
          ) : visibleResults.length ? (
            <div className="mt-3 max-h-[min(26rem,60vh)] divide-y divide-line overflow-y-auto border-y border-line">
              {visibleResults.map((product) => {
                const image = product.image;
                return (
                  <Link
                    className="group grid grid-cols-[48px_1fr_auto] items-center gap-3 py-3"
                    href={`${localizedPaths[locale].product}/${product.slug}`}
                    key={product.id}
                    onClick={closeSearch}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-brand bg-blush">
                      {image ? <Image alt={image.alt} className="object-cover" fill sizes="48px" src={image.url} /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="font-redhat text-[11px] font-semibold text-ruby">{product.category}</p>
                      <p className="truncate font-newsreader text-lg text-ink">{product.name}</p>
                      <p className="font-redhat text-xs font-semibold text-ink">{formatMoney(product.price, locale, product.currency)}</p>
                    </div>
                    <ArrowRight aria-hidden="true" className="text-ruby transition-transform group-hover:translate-x-1" size={17} strokeWidth={1.5} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="px-1 pb-1 pt-4 font-redhat text-sm leading-6 text-muted">{t("search.emptyText")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
