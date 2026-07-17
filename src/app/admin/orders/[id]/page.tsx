import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrderActions } from "@/components/admin/order-actions";
import { ShipmentActions } from "@/components/admin/shipment-actions";
import { InternalNote } from "@/components/admin/internal-note";
import { getAdminOrder, orderStatusLabels } from "@/lib/admin/orders";
import { formatMoney } from "@/lib/money";
import { requireOrderAdmin } from "@/lib/admin-auth";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrderAdmin();
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();
  const address = (value: Record<string, string>) => Object.values(value).filter(Boolean).join(", ");
  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
        <Link className="font-redhat text-sm font-semibold text-ruby" href="/admin/orders">← Objednávky</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Objednávka</p><h1 className="mt-2 font-newsreader text-5xl">{order.orderNumber}</h1></div><span className="bg-blush px-3 py-2 font-redhat text-sm font-semibold text-ruby">{orderStatusLabels[order.status]}</span></div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-8">
            <section className="border-y border-line py-6"><h2 className="font-newsreader text-3xl">Položky</h2><div className="mt-4 divide-y divide-line">{order.lines.map((line) => <div className="grid grid-cols-[1fr_auto] gap-4 py-4 font-redhat text-sm" key={line.id}><div><p className="font-semibold">{line.quantity}× {line.name}</p>{line.variant ? <p className="text-muted">{line.variant}</p> : null}<p className="text-xs text-muted">{line.sku}</p></div><p className="font-semibold">{formatMoney(line.lineTotalMinor, "cs", order.currency)}</p></div>)}</div><dl className="ml-auto mt-4 grid max-w-sm gap-2 font-redhat text-sm"><div className="flex justify-between"><dt>Mezisoučet</dt><dd>{formatMoney(order.subtotalMinor, "cs", order.currency)}</dd></div><div className="flex justify-between"><dt>Sleva</dt><dd>−{formatMoney(order.discountMinor, "cs", order.currency)}</dd></div><div className="flex justify-between"><dt>Doprava</dt><dd>{formatMoney(order.shippingMinor, "cs", order.currency)}</dd></div><div className="flex justify-between"><dt>Platební poplatek</dt><dd>{formatMoney(order.paymentFeeMinor, "cs", order.currency)}</dd></div><div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Celkem</dt><dd>{formatMoney(order.totalMinor, "cs", order.currency)}</dd></div></dl></section>
            <OrderActions currentStatus={order.status} orderId={order.id} />
            <section><h2 className="font-newsreader text-3xl">Historie stavů</h2><div className="mt-4 divide-y divide-line border-y border-line">{order.history.map((entry) => <div className="grid gap-2 py-4 font-redhat text-sm md:grid-cols-[10rem_1fr_auto]" key={entry.id}><span className="font-semibold">{orderStatusLabels[entry.newStatus as keyof typeof orderStatusLabels] ?? entry.newStatus}</span><span className="text-muted">{entry.note ?? "Bez poznámky"}{entry.emailMessageId ? " · e-mail zaznamenán" : entry.emailRequested ? " · e-mail požadován" : ""}</span><time className="text-xs text-muted">{new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.createdAt))}</time></div>)}</div></section>
            <section><h2 className="font-newsreader text-3xl">Historie e-mailů</h2><div className="mt-4 divide-y divide-line border-y border-line">{order.emails.map((email) => <div className="grid gap-2 py-4 font-redhat text-sm md:grid-cols-[1fr_auto]" key={email.id}><div><p className="font-semibold">{email.subject}</p><p className="text-xs text-muted">{email.recipient} · {email.templateKey}{email.errorMessage ? ` · ${email.errorMessage}` : ""}</p></div><span className="text-xs font-semibold text-ruby">{email.status}</span></div>)}{!order.emails.length ? <p className="py-4 font-redhat text-sm text-muted">Zatím nebyl zaznamenán žádný e-mail.</p> : null}</div></section>
            <section><h2 className="font-newsreader text-3xl">Audit administrace</h2><div className="mt-4 divide-y divide-line border-y border-line">{order.audit.map((entry) => <div className="grid gap-2 py-4 font-redhat text-sm md:grid-cols-[8rem_1fr_auto]" key={entry.id}><span className="font-semibold">{entry.action}</span><span className="text-muted">{entry.actorUserId ?? "serverová akce"}</span><time className="text-xs text-muted">{new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.createdAt))}</time></div>)}{!order.audit.length ? <p className="py-4 font-redhat text-sm text-muted">Bez auditovaných změn.</p> : null}</div></section>
          </div>

          <aside className="space-y-7 font-redhat text-sm">
            <section className="border border-line bg-white p-5"><h2 className="font-newsreader text-2xl">Zákazník</h2><p className="mt-4 font-semibold">{order.customer}</p><a className="mt-1 block text-ruby" href={`mailto:${order.email}`}>{order.email}</a>{order.phone ? <a className="mt-1 block" href={`tel:${order.phone}`}>{order.phone}</a> : null}<p className="mt-4 text-muted">Doručení: {address(order.shippingAddress)}</p><p className="mt-2 text-muted">Fakturace: {address(order.billingAddress)}</p></section>
            <section className="border border-line bg-white p-5"><h2 className="font-newsreader text-2xl">Platba a doprava</h2><dl className="mt-4 grid gap-2"><div><dt className="font-semibold">Platba</dt><dd className="text-muted">{order.paymentMethod} · {order.paymentStatus}</dd></div><div><dt className="font-semibold">Doprava</dt><dd className="text-muted">{order.shippingMethod}</dd></div>{order.packetaPoint.id ? <div><dt className="font-semibold">Výdejní místo</dt><dd className="text-muted">{order.packetaPoint.name} ({order.packetaPoint.id})</dd></div> : null}</dl></section>
            <section className="border border-line bg-white p-5"><h2 className="font-newsreader text-2xl">Tracking</h2>{order.shipment ? <dl className="mt-4 grid gap-2"><div><dt className="font-semibold">Packeta ID</dt><dd className="text-muted">{order.shipment.providerPacketId ?? "čeká"}</dd></div><div><dt className="font-semibold">Tracking</dt><dd>{order.shipment.trackingUrl ? <a className="text-ruby" href={order.shipment.trackingUrl} rel="noreferrer" target="_blank">{order.shipment.trackingNumber}</a> : "zatím není"}</dd></div></dl> : <p className="mt-4 text-muted">Zásilka zatím nebyla vytvořena.</p>}<ShipmentActions hasPacket={Boolean(order.shipment?.providerPacketId)} hasTracking={Boolean(order.shipment?.trackingNumber && order.shipment?.trackingUrl)} isPacketa={order.shippingMethod.startsWith("packeta_")} isShipped={order.status === "shipped"} orderId={order.id} /></section>
            <section className="border border-line bg-white p-5"><h2 className="font-newsreader text-2xl">Poznámky</h2><p className="mt-4"><strong>Zákazník:</strong> {order.customerNote ?? "bez poznámky"}</p><InternalNote initialValue={order.internalNote ?? ""} orderId={order.id} /></section>
          </aside>
        </div>
      </main>
    </AdminShell>
  );
}
