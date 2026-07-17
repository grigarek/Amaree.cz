import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { listAdminProducts } from "@/lib/admin/products";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const productCount = (await listAdminProducts()).length;
  let orderCount = 0;
  let discountCount = 0;
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const [orders, discounts] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("discount_codes").select("id", { count: "exact", head: true }).eq("active", true)
    ]);
    orderCount = orders.count ?? 0;
    discountCount = discounts.count ?? 0;
  }
  const tiles = [
    { label: "Produkty", href: "/admin/products", value: productCount },
    ...(admin.role === "admin" ? [
      { label: "Objednávky", href: "/admin/orders", value: orderCount },
      { label: "Aktivní slevy", href: "/admin/discounts", value: discountCount }
    ] : [])
  ];
  return (
    <AdminShell>
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
    </AdminShell>
  );
}
