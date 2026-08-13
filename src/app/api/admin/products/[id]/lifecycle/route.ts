import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin/session";
import { getAdminProduct, saveAdminProduct, setAdminProductStatus } from "@/lib/admin/products";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("duplicate") }),
  z.object({ action: z.literal("setStatus"), status: z.enum(["draft", "active", "hidden", "archived"]) })
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Neoprávněný přístup." }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Neplatná akce." }, { status: 422 });
  const { id } = await params;
  try {
    if (parsed.data.action === "duplicate") {
      const source = await getAdminProduct(id);
      if (!source) return NextResponse.json({ error: "Produkt nebyl nalezen." }, { status: 404 });
      const suffix = Date.now().toString().slice(-6);
      const copy = {
        ...source.input,
        sku: `${source.input.sku}-COPY-${suffix}`,
        publicationStatus: "draft" as const,
        translations: {
          cs: { ...source.input.translations.cs, name: `${source.input.translations.cs.name} – kopie`, slug: `${source.input.translations.cs.slug}-kopie-${suffix}` },
          sk: { ...source.input.translations.sk, name: `${source.input.translations.sk.name} – kópia`, slug: `${source.input.translations.sk.slug}-kopia-${suffix}` },
          en: { ...source.input.translations.en, name: `${source.input.translations.en.name} – copy`, slug: `${source.input.translations.en.slug}-copy-${suffix}` },
          de: { ...source.input.translations.de, name: `${source.input.translations.de.name} – Kopie`, slug: `${source.input.translations.de.slug}-kopie-${suffix}` }
        }
      };
      const newId = await saveAdminProduct(copy);
      revalidatePath("/admin/products");
      return NextResponse.json({ id: newId });
    }

    const issues = await setAdminProductStatus(id, parsed.data.status);
    if (issues.length) return NextResponse.json({ error: "Produkt nelze publikovat.", issues }, { status: 422 });
    revalidatePath("/admin/products");
    revalidatePath("/cs");
    revalidatePath("/sk");
    return NextResponse.json({ id, status: parsed.data.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Akci se nepodařilo provést." }, { status: 500 });
  }
}
