import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin/session";
import { checkAdminProductIdentifiers, suggestAdminProductIdentifiers } from "@/lib/admin/products";

const querySchema = z.object({
  name: z.string().trim().min(2).max(160),
  productId: z.string().uuid().optional(),
  sku: z.string().trim().max(64).optional(),
  slug: z.string().trim().max(120).optional()
});

export async function GET(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Neoprávněný přístup." }, { status: 401 });

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    name: url.searchParams.get("name"),
    productId: url.searchParams.get("productId") || undefined,
    sku: url.searchParams.get("sku") || undefined,
    slug: url.searchParams.get("slug") || undefined
  });
  if (!parsed.success) return NextResponse.json({ error: "Zadejte platný název produktu." }, { status: 422 });

  try {
    const suggestion = await suggestAdminProductIdentifiers(parsed.data.name, parsed.data.productId);
    const availability = parsed.data.sku && parsed.data.slug
      ? await checkAdminProductIdentifiers(parsed.data.sku, parsed.data.slug, parsed.data.productId)
      : { skuAvailable: true, slugAvailable: true };
    return NextResponse.json({ ...suggestion, ...availability });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Návrh identifikátorů se nepodařilo vytvořit." }, { status: 500 });
  }
}
