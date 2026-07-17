import { NextResponse } from "next/server";
import { z } from "zod";
import { getCatalogCategories, getCatalogProducts } from "@/lib/catalog";

const querySchema = z.object({
  q: z.string().trim().min(1).max(100),
  locale: z.enum(["cs", "en", "de"])
});

function normalize(value: string, locale: "cs" | "en" | "de") {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase(locale);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q"), locale: url.searchParams.get("locale") });
  if (!parsed.success) return NextResponse.json({ results: [] });
  const { q, locale } = parsed.data;
  const [products, categories] = await Promise.all([getCatalogProducts(locale), getCatalogCategories()]);
  const needle = normalize(q, locale);
  const results = products.filter((product) => {
    const category = categories.find((item) => item.slug === product.category);
    return normalize([
      product.name[locale], product.shortDescription[locale], product.longDescription[locale],
      product.material[locale], product.dimensions[locale], product.sku, category?.name[locale] ?? ""
    ].join(" "), locale).includes(needle);
  }).slice(0, 5).map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name[locale],
    category: categories.find((item) => item.slug === product.category)?.name[locale] ?? "",
    price: product.price,
    currency: product.currency,
    image: product.images[0] ? { url: product.images[0].url, alt: product.images[0].alt[locale] } : null
  }));
  return NextResponse.json({ results }, { headers: { "Cache-Control": "private, max-age=30" } });
}
