import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";
import { getAdminProduct, listAdminProductImages } from "@/lib/admin/products";

export default async function AdminProductDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ imageUpload?: string }>;
}) {
  const { id } = await params;
  const { imageUpload } = await searchParams;
  const product = await getAdminProduct(id);
  if (!product) notFound();
  const images = await listAdminProductImages(id);

  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
      <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Editace produktu</p>
      <h1 className="mt-3 font-newsreader text-5xl">{product.input.translations.cs.name}</h1>
      {imageUpload === "failed" ? (
        <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 font-redhat text-sm font-semibold text-red-700" role="alert">
          Produkt byl vytvořen, ale fotografie se nepodařilo nahrát. Vyberte je znovu níže; další produkt už nevytvářejte.
        </p>
      ) : null}
      <ProductForm initial={product.input} initialImages={images} internalId={product.internalId} productId={id} />
      </main>
    </AdminShell>
  );
}
