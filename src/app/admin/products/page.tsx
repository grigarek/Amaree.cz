import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { listAdminProducts } from "@/lib/admin/products";
import { formatMoney } from "@/lib/money";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string }> }) {
  const { q = "", state = "all" } = await searchParams;
  const products = await listAdminProducts(q, state);
  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Produkty</p>
          <h1 className="mt-3 font-newsreader text-5xl">Správa produktů</h1>
        </div>
        <Link href="/admin/products/new" className="rounded-brand bg-ruby px-5 py-3 font-redhat text-sm font-semibold text-white">
          Vytvořit produkt
        </Link>
      </div>
      <form className="mt-7 flex flex-wrap gap-3" method="get">
        <label className="sr-only" htmlFor="admin-product-search">Hledat produkt</label>
        <input className="min-h-11 min-w-[16rem] flex-1 rounded-brand border border-line bg-white px-4 font-redhat text-sm" defaultValue={q} id="admin-product-search" name="q" placeholder="Název, SKU nebo interní ID" type="search" />
        <select aria-label="Stav produktu" className="min-h-11 rounded-brand border border-line bg-white px-4 font-redhat text-sm" defaultValue={state} name="state"><option value="all">Všechny</option><option value="active">Aktivní</option><option value="inactive">Neaktivní</option><option value="archived">Archivované</option></select>
        <button className="min-h-11 rounded-brand border border-ruby px-5 font-redhat text-sm font-semibold text-ruby" type="submit">Filtrovat</button>
      </form>
      <div className="mt-8 overflow-x-auto rounded-brand border border-line bg-white">
        <table className="w-full border-collapse text-left font-redhat text-sm">
          <thead className="bg-blush">
            <tr>
              <th className="p-4">Název</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Cena</th>
              <th className="p-4">Sklad</th>
              <th className="p-4">Stav</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-line">
                <td className="p-4">
                  <Link href={`/admin/products/${product.id}`} className="font-semibold text-ruby">
                    {product.name}
                  </Link>
                </td>
                <td className="p-4">{product.sku}</td>
                <td className="p-4">{formatMoney(product.priceCzkMinor)}</td>
                <td className="p-4">{product.stockQuantity}</td>
                <td className="p-4">{product.archived ? "Archivováno" : product.active ? "Aktivní" : "Neaktivní"}</td>
              </tr>
            ))}
            {!products.length ? <tr className="border-t border-line"><td className="p-6 text-center text-muted" colSpan={5}>Žádné produkty. První skutečný produkt vytvořte tlačítkem nahoře.</td></tr> : null}
          </tbody>
        </table>
      </div>
      </main>
    </AdminShell>
  );
}
