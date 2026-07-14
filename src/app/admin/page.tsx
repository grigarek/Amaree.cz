import Link from "next/link";
import { products } from "@/lib/products";

const tiles = [
  { label: "Produkty", href: "/admin/products", value: products.length },
  { label: "Objednávky", href: "/admin/orders", value: 0 },
  { label: "Slevové kódy", href: "/admin/discounts", value: 1 },
  { label: "Odběratelé", href: "/admin/subscribers", value: 0 }
];

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-page px-5 py-10">
      <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Chráněná administrace</p>
      <h1 className="mt-3 font-newsreader text-5xl">Přehled</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.href} href={{ pathname: tile.href }} className="rounded-brand border border-line bg-white p-5 shadow-product">
            <p className="font-redhat text-sm font-semibold text-muted">{tile.label}</p>
            <p className="mt-4 font-newsreader text-5xl">{tile.value}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
