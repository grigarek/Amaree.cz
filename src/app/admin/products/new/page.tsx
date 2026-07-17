import { ImagePlus } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";
import { createEmptyAdminProduct } from "@/lib/products/admin-product-schema";

export default async function NewProductPage() {
  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
      <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Nový produkt</p>
      <h1 className="mt-3 font-newsreader text-5xl">Vytvoření produktu</h1>
      <section className="mt-8 border border-line bg-white p-5 sm:p-6" aria-labelledby="new-product-images-heading">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-brand bg-blush text-ruby"><ImagePlus size={22} /></span>
          <div>
            <p className="font-redhat text-xs font-semibold uppercase tracking-[0.16em] text-ruby">Dostupné po prvním uložení</p>
            <h2 className="mt-1 font-newsreader text-3xl" id="new-product-images-heading">Fotografie a jejich pořadí</h2>
            <p className="mt-2 max-w-3xl font-redhat text-sm leading-6 text-muted">
              Nejprve vyplňte a uložte základ produktu. Následně budete automaticky přesměrováni k nahrání fotografií, volbě hlavního snímku, ALT textům a řazení zobrazení.
            </p>
          </div>
        </div>
      </section>
      <ProductForm initial={createEmptyAdminProduct()} />
      </main>
    </AdminShell>
  );
}
