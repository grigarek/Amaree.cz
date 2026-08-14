import Link from "next/link";
import { Activity, AlertCircle, ArrowRight, BarChart3, Boxes, CircleDollarSign, PackageCheck, ShoppingBag } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { listAdminProducts } from "@/lib/admin/products";
import { getCloudflareTrafficSummary, getDashboardMetrics, getStorefrontEngagementSummary } from "@/lib/admin/dashboard";
import { requireAdmin } from "@/lib/admin-auth";
import { formatMoney } from "@/lib/money";
import { orderStatusLabels } from "@/lib/orders/statuses";

const integer = new Intl.NumberFormat("cs-CZ");

export default async function AdminPage() {
  const admin = await requireAdmin();
  const productCount = (await listAdminProducts()).length;
  const [metrics, traffic, engagement] = admin.role === "admin"
    ? await Promise.all([getDashboardMetrics(), getCloudflareTrafficSummary(), getStorefrontEngagementSummary()])
    : [null, null, null];

  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Chráněná administrace</p>
            <h1 className="mt-3 font-newsreader text-5xl">Přehled</h1>
            <p className="mt-3 font-redhat text-sm text-muted">Aktuální provoz e-shopu AMARÉE na jednom místě.</p>
          </div>
          <Link className="inline-flex min-h-11 items-center gap-2 bg-ruby px-5 font-redhat text-sm font-semibold text-white" href="/admin/products/new">Přidat produkt <ArrowRight size={17} /></Link>
        </div>

        <section aria-label="Hlavní metriky" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={<Boxes size={19} />} label="Produkty" value={integer.format(productCount)} href="/admin/products" />
          {metrics ? <MetricCard icon={<ShoppingBag size={19} />} label="Objednávky za 30 dní" value={integer.format(metrics.ordersLast30Days)} href="/admin/orders" /> : null}
          {metrics ? <MetricCard icon={<AlertCircle size={19} />} label="Vyžadují pozornost" value={integer.format(metrics.actionRequired)} tone={metrics.actionRequired > 0 ? "alert" : "default"} href="/admin/orders?status=new" /> : null}
          {metrics ? <MetricCard icon={<CircleDollarSign size={19} />} label="Potvrzený obrat" value={formatDualMoney(metrics.turnover)} /> : null}
        </section>

        {metrics ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
            <section className="border border-line bg-white">
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                <div><p className="font-redhat text-xs font-semibold uppercase tracking-[0.14em] text-ruby">Objednávky</p><h2 className="mt-1 font-newsreader text-3xl">Poslední aktivita</h2></div>
                <Link className="font-redhat text-sm font-semibold text-ruby" href="/admin/orders">Zobrazit vše</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left font-redhat text-sm">
                  <thead><tr className="text-xs uppercase text-muted"><th className="px-5 py-3">Objednávka</th><th className="px-5 py-3">Zákazník</th><th className="px-5 py-3">Hodnota</th><th className="px-5 py-3">Stav</th><th className="px-5 py-3">Datum</th><th className="px-5 py-3 text-right"><span className="sr-only">Otevřít</span></th></tr></thead>
                  <tbody>{metrics.recentOrders.map((order) => <tr className="border-t border-line" key={order.id}><td className="px-5 py-4 font-semibold">{order.orderNumber}</td><td className="px-5 py-4">{order.customer}</td><td className="whitespace-nowrap px-5 py-4 font-semibold">{formatMoney(order.totalMinor, "cs", order.currency)}</td><td className="px-5 py-4"><span className="whitespace-nowrap bg-blush px-2 py-1 text-xs font-semibold text-ruby">{orderStatusLabels[order.status]}</span></td><td className="whitespace-nowrap px-5 py-4 text-muted">{new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short" }).format(new Date(order.createdAt))}</td><td className="px-5 py-4 text-right"><Link aria-label={`Otevřít objednávku ${order.orderNumber}`} className="inline-flex size-10 items-center justify-center border border-line text-ruby transition hover:border-ruby hover:bg-blush" href={`/admin/orders/${order.id}`} title="Otevřít objednávku"><ArrowRight size={18} /></Link></td></tr>)}</tbody>
                </table>
                {!metrics.recentOrders.length ? <p className="p-6 font-redhat text-sm text-muted">Zatím nebyla vytvořena žádná objednávka.</p> : null}
              </div>
            </section>

            <div className="grid gap-6">
              <section className="border border-line bg-white p-5">
                <div className="flex items-center gap-2 text-ruby"><PackageCheck size={19} /><p className="font-redhat text-xs font-semibold uppercase tracking-[0.14em]">Provoz</p></div>
                <dl className="mt-5 grid gap-4 font-redhat text-sm">
                  <DashboardRow label="Všechny objednávky" value={integer.format(metrics.ordersTotal)} />
                  <DashboardRow label="Hodnota otevřených" value={formatDualMoney(metrics.openOrderValue)} />
                  <DashboardRow label="Problémy e-mailů" value={integer.format(metrics.emailIssues)} alert={metrics.emailIssues > 0} />
                </dl>
              </section>
              <TrafficCard traffic={traffic} />
              <EngagementCard engagement={engagement} />
            </div>
          </div>
        ) : null}

        {metrics ? (
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="border border-line bg-white p-5">
              <p className="font-redhat text-xs font-semibold uppercase tracking-[0.14em] text-ruby">Produkty</p>
              <h2 className="mt-1 font-newsreader text-3xl">Nejčastěji objednávané</h2>
              <div className="mt-5 grid gap-3">{metrics.topProducts.map((product, index) => <div className="flex items-center justify-between gap-4 border-b border-line pb-3 font-redhat text-sm" key={product.sku}><div className="flex min-w-0 items-center gap-3"><span className="flex size-7 shrink-0 items-center justify-center bg-blush text-xs font-semibold text-ruby">{index + 1}</span><div className="min-w-0"><p className="truncate font-semibold">{product.name}</p><p className="text-xs text-muted">{product.sku}</p></div></div><strong>{product.quantity} ks</strong></div>)}</div>
              {!metrics.topProducts.length ? <p className="mt-5 font-redhat text-sm text-muted">Po prvních objednávkách se zde zobrazí pořadí produktů.</p> : null}
            </div>
            <div className="border border-line bg-white p-5">
              <p className="font-redhat text-xs font-semibold uppercase tracking-[0.14em] text-ruby">Stavy objednávek</p>
              <h2 className="mt-1 font-newsreader text-3xl">Rozložení procesu</h2>
              <div className="mt-5 grid gap-3">{Object.entries(metrics.statusCounts).map(([status, count]) => <div className="flex items-center justify-between gap-4 font-redhat text-sm" key={status}><span>{orderStatusLabels[status as keyof typeof orderStatusLabels]}</span><strong>{integer.format(count)}</strong></div>)}</div>
            </div>
          </section>
        ) : null}
      </main>
    </AdminShell>
  );
}

function MetricCard({ icon, label, value, href, tone = "default" }: { icon: React.ReactNode; label: string; value: string; href?: string; tone?: "default" | "alert" }) {
  const body = <><div className={`flex items-center gap-2 ${tone === "alert" ? "text-ruby" : "text-muted"}`}>{icon}<p className="font-redhat text-sm font-semibold">{label}</p></div><p className="mt-4 font-newsreader text-4xl">{value}</p></>;
  return href ? <Link className="border border-line bg-white p-5 shadow-product transition hover:border-ruby" href={href}>{body}</Link> : <div className="border border-line bg-white p-5 shadow-product">{body}</div>;
}

function DashboardRow({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return <div className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0"><dt className="text-muted">{label}</dt><dd className={alert ? "font-semibold text-ruby" : "font-semibold text-ink"}>{value}</dd></div>;
}

function formatDualMoney(values: Record<"CZK" | "EUR", number>) {
  const parts = (["CZK", "EUR"] as const).filter((currency) => values[currency] > 0).map((currency) => formatMoney(values[currency], currency === "EUR" ? "sk" : "cs", currency));
  return parts.length ? parts.join(" · ") : "0 Kč";
}

function TrafficCard({ traffic }: { traffic: Awaited<ReturnType<typeof getCloudflareTrafficSummary>> | null }) {
  const maximum = Math.max(1, ...(traffic?.daily.map((day) => day.visits) ?? []));
  return <section className="border border-line bg-white p-5"><div className="flex items-center gap-2 text-ruby"><BarChart3 size={19} /><p className="font-redhat text-xs font-semibold uppercase tracking-[0.14em]">Návštěvnost webu</p></div>{traffic?.configured && !traffic.error ? <><div className="mt-4 grid grid-cols-2 gap-4"><div><p className="font-newsreader text-4xl">{integer.format(traffic.visits7Days ?? 0)}</p><p className="mt-1 font-redhat text-xs text-muted">návštěv za 7 dní</p></div><div className="border-l border-line pl-4"><p className="font-newsreader text-4xl">{integer.format(traffic.pageViews7Days ?? 0)}</p><p className="mt-1 font-redhat text-xs text-muted">zobrazení stránek za 7 dní</p></div></div><p className="mt-3 font-redhat text-xs leading-5 text-muted">Dnes: {integer.format(traffic.visitsToday ?? 0)} návštěv a {integer.format(traffic.pageViewsToday ?? 0)} zobrazení. Jedna návštěva není unikátní osoba; opakovaný příchod se může započítat znovu. Data zatím zahrnují i naše testovací otevření webu a administrace.</p><div aria-label="Denní návštěvnost za posledních sedm dní" className="mt-5 grid h-24 grid-cols-7 items-end gap-2">{traffic.daily.map((day) => { const height = Math.max(6, Math.round((day.visits / maximum) * 72)); return <div className="flex h-full min-w-0 flex-col items-center justify-end gap-1" key={day.date}><span className="font-redhat text-[10px] font-semibold text-muted">{integer.format(day.visits)}</span><span className="w-full bg-ruby/75" style={{ height }} /><span className="font-redhat text-[10px] text-muted">{new Intl.DateTimeFormat("cs-CZ", { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${day.date}T12:00:00Z`))}</span></div>; })}</div><div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 font-redhat text-xs text-muted"><span>{integer.format(traffic.requests7Days ?? 0)} technických požadavků</span><span className="flex items-center gap-1.5"><Activity size={14} />Data z prohlížeče</span></div></> : <><p className="mt-4 font-redhat text-sm font-semibold">{traffic?.error ? "Data Cloudflare se nyní nepodařilo načíst." : "Připraveno k propojení s Cloudflare."}</p><p className="mt-2 font-redhat text-sm leading-6 text-muted">{traffic?.error ? "Připojení je aktivní. Obnovte stránku; pokud chyba přetrvá, zkontrolujte oprávnění Analytics read." : "Pro přehled je potřeba read-only Analytics token, Account ID a Zone ID. Cloudflare Web Analytics nepoužívá vlastní sledovací cookies ani osobní údaje."}</p><a className="mt-4 inline-flex items-center gap-2 font-redhat text-sm font-semibold text-ruby" href="https://dash.cloudflare.com/" rel="noreferrer" target="_blank">Otevřít Cloudflare <ArrowRight size={15} /></a></>}</section>;
}

function EngagementCard({ engagement }: { engagement: Awaited<ReturnType<typeof getStorefrontEngagementSummary>> | null }) {
  return <section className="border border-line bg-white p-5"><div className="flex items-center gap-2 text-ruby"><Activity size={19} /><p className="font-redhat text-xs font-semibold uppercase tracking-[0.14em]">Chování návštěvníků</p></div>{engagement?.configured && !engagement.error ? <><div className="mt-4 grid grid-cols-3 gap-3"><div><p className="font-newsreader text-3xl">{integer.format(engagement.sessions)}</p><p className="font-redhat text-xs text-muted">relací</p></div><div><p className="font-newsreader text-3xl">{integer.format(engagement.pageViews)}</p><p className="font-redhat text-xs text-muted">stránek</p></div><div><p className="font-newsreader text-3xl">{integer.format(engagement.averageSeconds)} s</p><p className="font-redhat text-xs text-muted">aktivně průměrně</p></div></div><div className="mt-5 grid gap-3">{engagement.topPages.map((page) => <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-line pt-3 font-redhat text-xs" key={page.path}><span className="truncate font-semibold" title={page.path}>{page.path}</span><span className="whitespace-nowrap text-muted">{page.pageViews}× · {page.averageSeconds} s</span></div>)}</div><p className="mt-4 font-redhat text-xs leading-5 text-muted">Pouze anonymní relace návštěvníků, kteří povolili analytiku. Nezaznamenáváme IP adresu, zařízení ani osobní údaje.</p></> : <><p className="mt-4 font-redhat text-sm font-semibold">{engagement?.error ? "Přehled zatím nelze načíst." : "Měření se aktivuje po nasazení databázové migrace."}</p><p className="mt-2 font-redhat text-xs leading-5 text-muted">První údaje se objeví po souhlasu reálných návštěvníků s analytikou.</p></>}</section>;
}
