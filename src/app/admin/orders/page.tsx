import { AdminShell } from "@/components/admin/admin-shell";
import Link from "next/link";
import { listAdminOrders, orderStatusLabels, orderStatuses } from "@/lib/admin/orders";
import { formatMoney } from "@/lib/money";
import { requireOrderAdmin } from "@/lib/admin-auth";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireOrderAdmin();
  const { q = "", status = "all" } = await searchParams;
  const orders = await listAdminOrders(q, status);
  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
        <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Administrace</p>
        <h1 className="mt-3 font-newsreader text-5xl">Objednávky</h1>
        <form className="mt-7 flex flex-wrap gap-3" method="get">
          <label className="sr-only" htmlFor="order-search">Hledat objednávku</label>
          <input className="min-h-11 min-w-[17rem] flex-1 border border-line bg-white px-4 font-redhat text-sm" defaultValue={q} id="order-search" name="q" placeholder="Číslo, zákazník, e-mail nebo produkt" type="search" />
          <select aria-label="Stav objednávky" className="min-h-11 border border-line bg-white px-4 font-redhat text-sm" defaultValue={status} name="status"><option value="all">Všechny stavy</option>{orderStatuses.map((item) => <option key={item} value={item}>{orderStatusLabels[item]}</option>)}</select>
          <button className="min-h-11 border border-ruby px-5 font-redhat text-sm font-semibold text-ruby" type="submit">Filtrovat</button>
        </form>

        <div className="mt-8 overflow-x-auto border border-line bg-white">
          <table className="w-full border-collapse text-left font-redhat text-sm">
            <thead className="bg-blush"><tr><th className="p-4">Objednávka</th><th className="p-4">Zákazník</th><th className="p-4">Položky</th><th className="p-4">Cena</th><th className="p-4">Platba</th><th className="p-4">Doprava</th><th className="p-4">Datum</th><th className="p-4">Stav</th></tr></thead>
            <tbody>
              {orders.map((order) => <tr className="border-t border-line align-top" key={order.id}>
                <td className="p-4"><Link className="font-semibold text-ruby" href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link></td>
                <td className="p-4"><span className="font-semibold">{order.customer}</span><br /><span className="text-xs text-muted">{order.email}</span></td>
                <td className="max-w-xs p-4 text-xs leading-5">{order.items}</td>
                <td className="whitespace-nowrap p-4 font-semibold">{formatMoney(order.totalMinor, "cs", order.currency)}</td>
                <td className="p-4">{order.paymentMethod}<br /><span className="text-xs text-muted">{order.paymentStatus}</span></td>
                <td className="p-4">{order.shippingMethod}</td>
                <td className="whitespace-nowrap p-4">{new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" }).format(new Date(order.createdAt))}</td>
                <td className="p-4"><span className="whitespace-nowrap bg-blush px-2 py-1 text-xs font-semibold text-ruby">{orderStatusLabels[order.status]}</span></td>
              </tr>)}
              {!orders.length ? <tr className="border-t border-line"><td className="p-6 text-center text-muted" colSpan={8}>Žádné objednávky odpovídající filtru.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </main>
    </AdminShell>
  );
}
