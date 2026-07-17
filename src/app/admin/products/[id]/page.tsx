import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImages } from "@/components/admin/product-images";
import { getAdminProduct, listAdminProductImages } from "@/lib/admin/products";

export default async function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getAdminProduct(id);
  if (!product) notFound();
  const images = await listAdminProductImages(id);

  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
      <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Editace produktu</p>
      <h1 className="mt-3 font-newsreader text-5xl">{product.translations.cs.name}</h1>
      <nav aria-label="Sekce produktu" className="mt-6 flex flex-wrap gap-2 font-redhat text-sm font-semibold">
        <a className="rounded-brand bg-ruby px-4 py-2.5 text-white" href="#product-images">Fotografie ({images.length})</a>
        <a className="rounded-brand border border-line bg-white px-4 py-2.5 text-ink" href="#product-details">Údaje produktu</a>
      </nav>
      <ProductImages
        defaultAlt={{ cs: product.translations.cs.name, en: product.translations.en.name, de: product.translations.de.name }}
        initialImages={images}
        productId={id}
      />
      <div className="scroll-mt-28" id="product-details">
        <ProductForm initial={product} productId={id} />
      </div>
      </main>
    </AdminShell>
  );
}
