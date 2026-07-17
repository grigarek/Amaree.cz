import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { localizedPaths, type Locale } from "@/i18n/routing";
import { getCategoryBySlug } from "@/lib/products";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/types/domain";
import { AddToCartButton } from "./add-to-cart-button";

export async function ProductCard({ product, locale, eager = false, compact = false }: { product: Product; locale: Locale; eager?: boolean; compact?: boolean }) {
  const t = await getTranslations("product");
  const category = getCategoryBySlug(product.category);
  const first = product.images[0];
  const second = product.images[1] ?? first;

  return (
    <article className="group">
      <Link href={`${localizedPaths[locale].product}/${product.slug}`} className="block overflow-hidden rounded-brand bg-blush">
        <div className={`relative ${compact ? "aspect-square" : "aspect-[4/5]"}`}>
          <Image
            src={first.url}
            alt={first.alt[locale]}
            fill
            loading={eager ? "eager" : "lazy"}
            sizes="(min-width: 768px) 33vw, 90vw"
            className="object-cover transition duration-500 group-hover:opacity-0"
          />
          <Image
            src={second.url}
            alt={second.alt[locale]}
            fill
            sizes="(min-width: 768px) 33vw, 90vw"
            className="object-cover opacity-0 transition duration-500 group-hover:opacity-100"
          />
          {product.originalPrice ? (
            <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 font-redhat text-xs font-semibold text-ruby">
              -{Math.round(100 - (product.price / product.originalPrice) * 100)} %
            </span>
          ) : null}
        </div>
      </Link>
      <div className={`${compact ? "mt-3" : "mt-4"} flex items-start justify-between gap-4`}>
        <div>
          <p className="amaree-ui text-ruby">{category.name[locale]}</p>
          <Link href={`${localizedPaths[locale].product}/${product.slug}`} className={`mt-1 block font-newsreader ${compact ? "text-xl" : "text-2xl"}`}>
            {product.name[locale]}
          </Link>
          <p className="mt-1 font-redhat text-sm text-muted">{product.stockQuantity > 0 ? t("inStock") : t("soldOut")}</p>
        </div>
        <div className="text-right font-redhat text-sm font-semibold">
          <div>{formatMoney(product.price, locale)}</div>
          {product.originalPrice ? <div className="text-muted line-through">{formatMoney(product.originalPrice, locale)}</div> : null}
        </div>
      </div>
      <div className={compact ? "mt-3" : "mt-4"}>
        <AddToCartButton product={product} disabled={product.stockQuantity < 1} />
      </div>
      <span className="sr-only">{t("demo")}</span>
    </article>
  );
}
