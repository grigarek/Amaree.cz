import { AdminShell } from "@/components/admin/admin-shell";

export default async function NewProductPage() {
  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
      <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Nový produkt</p>
      <h1 className="mt-3 font-newsreader text-5xl">Vytvoření produktu</h1>
      <div className="mt-8 grid gap-5 rounded-brand border border-line bg-white p-6" role="group">
        <label className="sr-only" htmlFor="new-product-name">Název česky</label>
        <input className="rounded-brand border border-line px-4 py-3" id="new-product-name" name="nameCs" placeholder="Název česky" />
        <label className="sr-only" htmlFor="new-product-sku">SKU</label>
        <input className="rounded-brand border border-line px-4 py-3" id="new-product-sku" name="sku" placeholder="SKU" />
        <label className="sr-only" htmlFor="new-product-price">Cena v haléřích</label>
        <input className="rounded-brand border border-line px-4 py-3" id="new-product-price" name="price" placeholder="Cena v haléřích" type="number" />
        <label className="sr-only" htmlFor="new-product-description">Popis</label>
        <textarea className="min-h-28 rounded-brand border border-line px-4 py-3" id="new-product-description" name="descriptionCs" placeholder="Popis" />
        <button className="cursor-not-allowed rounded-brand bg-ruby px-5 py-3 font-redhat text-sm font-semibold text-white opacity-50" disabled type="button">Uložit návrh</button>
      </div>
      </main>
    </AdminShell>
  );
}
