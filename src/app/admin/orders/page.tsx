import { AdminShell } from "@/components/admin/admin-shell";
import Link from "next/link";
import { listAdminOrders, orderStatusLabels, orderStatuses } from "@/lib/admin/orders";
import { formatMoney } from "@/lib/money";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { ArrowRight } from "lucide-react";
import { paymentMethodLabel, paymentStatusLabel, shippingMethodLabel } from "@/lib/admin/order-display-labels";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; deleted?: string }> }) {
  await requireOrderAdmin();
  const { q = "", status = "all", deleted } = await searchParams;
  const orders = await listAdminOrders(q, status);
  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
        <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Administrace</p>
        <h1 className="mt-3 font-newsreader text-5xl">Objednávky</h1>
        {deleted === "1" ? (
          <p className="mt-5 border border-line bg-blush px-4 py-3 font-redhat text-sm font-semibold text-ruby" role="status">
            Objednávka byla trvale smazána.
          </p>
        ) : null}
        <form className="mt-7 flex flex-wrap gap-3" method="get">
          <label className="sr-only" htmlFor="order-search">Hledat objednávku</label>
          <input className="min-h-11 min-w-[17rem] flex-1 border border-line bg-white px-4 font-redhat text-sm" defaultValue={q} id="order-search" name="q" placeholder="Číslo, zákazník, e-mail nebo produkt" type="search" />
          <select aria-label="Stav objednávky" className="min-h-11 border border-line bg-white px-4 font-redhat text-sm" defaultValue={status} name="status"><option value="all">Všechny stavy</option>{orderStatuses.map((item) => <option key={item} value={item}>{orderStatusLabels[item]}</option>)}</select>
          <button className="min-h-11 border border-ruby px-5 font-redhat text-sm font-semibold text-ruby" type="submit">Filtrovat</button>
        </form>

        <div className="mt-8 overflow-x-auto border border-line bg-white">
          <table className="w-full border-collapse text-left font-redhat text-sm">
            <thead className="bg-blush"><tr><th className="p-4">Objednávka</th><th className="p-4">Zákazník</th><th className="p-4">Položky</th><th className="p-4">Cena</th><th className="p-4">Platba</th><th className="p-4">Doprava</th><th className="p-4">Datum</th><th className="p-4">Stav</th><th className="p-4 text-right"><span className="sr-only">Otevřít</span></th></tr></thead>
            <tbody>
              {orders.map((order) => <tr className="border-t border-line align-top" key={order.id}>
                <td className="p-4 font-semibold">{order.orderNumber}</td>
                <td className="p-4"><span className="font-semibold">{order.customer}</span><br /><span className="text-xs text-muted">{order.email}</span></td>
                <td className="max-w-xs p-4 text-xs leading-5">{order.items}</td>
                <td className="whitespace-nowrap p-4 font-semibold">{formatMoney(order.totalMinor, "cs", order.currency)}</td>
                <td className="p-4">{paymentMethodLabel(order.paymentMethod)}<br /><span className="text-xs text-muted">{paymentStatusLabel(order.paymentStatus)}</span></td>
                <td className="p-4">{shippingMethodLabel(order.shippingMethod)}</td>
                <td className="whitespace-nowrap p-4">{new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" }).format(new Date(order.createdAt))}</td>
                <td className="p-4"><span className="whitespace-nowrap bg-blush px-2 py-1 text-xs font-semibold text-ruby">{orderStatusLabels[order.status]}</span></td>
                <td className="p-4 text-right"><Link aria-label={`Otevřít objednávku ${order.orderNumber}`} className="inline-flex size-10 items-center justify-center border border-line text-ruby transition hover:border-ruby hover:bg-blush" href={`/admin/orders/${order.id}`} title="Otevřít objednávku"><ArrowRight size={18} /></Link></td>
              </tr>)}
              {!orders.length ? <tr className="border-t border-line"><td className="p-6 text-center text-muted" colSpan={9}>Žádné objednávky odpovídající filtru.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </main>
    </AdminShell>
  );
}
