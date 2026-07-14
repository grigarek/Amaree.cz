import Link from "next/link";
import { products } from "@/lib/products";
import { formatMoney } from "@/lib/money";

export default function AdminProductsPage() {
  return (
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
      <div className="mt-8 overflow-hidden rounded-brand border border-line bg-white">
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
                    {product.name.cs}
                  </Link>
                </td>
                <td className="p-4">{product.sku}</td>
                <td className="p-4">{formatMoney(product.price)}</td>
                <td className="p-4">{product.stockQuantity}</td>
                <td className="p-4">{product.active ? "Aktivní" : "Archivováno"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
