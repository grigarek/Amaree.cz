import { AdminShell } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";
import { createEmptyAdminProduct } from "@/lib/products/admin-product-schema";

export default async function NewProductPage() {
  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
      <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Nový produkt</p>
      <h1 className="mt-3 font-newsreader text-5xl">Vytvoření produktu</h1>
      <ProductForm initial={createEmptyAdminProduct()} />
      </main>
    </AdminShell>
  );
}
