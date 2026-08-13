import { AdminShell } from "@/components/admin/admin-shell";
import Link from "next/link";
import { Calculator, ChevronRight, Crown, FileText, Image as ImageIcon, Mail, Scale, Wrench } from "lucide-react";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { getPacketaOperationalSettings } from "@/lib/admin/integration-settings";
import { listAdminOrders } from "@/lib/admin/orders";
import { EmailTestSuite } from "@/components/admin/email-test-suite";
import { updatePacketaSettings } from "./actions";
import { getMaintenanceSettings } from "@/lib/admin/maintenance-settings";

const inputClass = "min-h-11 border border-line bg-white px-3 font-redhat text-sm";
const labelClass = "grid gap-2 font-redhat text-sm font-semibold";

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireOrderAdmin();
  const [settings, maintenance, query, allOrders] = await Promise.all([getPacketaOperationalSettings(), getMaintenanceSettings(), searchParams, listAdminOrders()]);
  const ownTestOrders = allOrders.filter((order) => order.email.toLocaleLowerCase() === "info@amaree.cz");
  const emailTestOrders = (ownTestOrders.length ? ownTestOrders : allOrders).slice(0, 10).map((order) => ({ id: order.id, orderNumber: order.orderNumber }));

  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
        <p className="font-redhat text-sm font-semibold uppercase text-ruby">Administrace</p>
        <h1 className="mt-3 font-newsreader text-5xl">Nastavení e-shopu</h1>
        <p className="mt-5 max-w-3xl font-redhat text-sm leading-6 text-muted">Zde upravujete běžná provozní nastavení. Citlivá hesla a přístupové klíče jsou bezpečně uložené mimo administraci.</p>
        <Link className="mt-7 flex max-w-2xl items-center justify-between gap-5 border border-line bg-white p-5 transition hover:border-ruby" href="/admin/settings/hero">
          <span className="flex items-start gap-4"><ImageIcon className="mt-1 shrink-0 text-ruby" size={23} /><span><strong className="block font-redhat text-base">Hlavní fotografie webu</strong><span className="mt-1 block font-redhat text-sm text-muted">Výměna hero fotografie a časování sezónních kampaní.</span></span></span><ChevronRight size={20} />
        </Link>
        <Link className="mt-4 flex max-w-2xl items-center justify-between gap-5 border border-line bg-white p-5 transition hover:border-ruby" href="/admin/settings/content">
          <span className="flex items-start gap-4"><FileText className="mt-1 shrink-0 text-ruby" size={23} /><span><strong className="block font-redhat text-base">Obsah webu</strong><span className="mt-1 block font-redhat text-sm text-muted">Úvodní texty, stránka O nás, její fotografie a hodiny podpory.</span></span></span><ChevronRight size={20} />
        </Link>
        <Link className="mt-4 flex max-w-2xl items-center justify-between gap-5 border border-line bg-white p-5 transition hover:border-ruby" href="/admin/settings/legal">
          <span className="flex items-start gap-4"><Scale className="mt-1 shrink-0 text-ruby" size={23} /><span><strong className="block font-redhat text-base">Právní údaje</strong><span className="mt-1 block font-redhat text-sm text-muted">Puncovní informace a další veřejné právní podklady.</span></span></span><ChevronRight size={20} />
        </Link>
        <Link className="mt-4 flex max-w-2xl items-center justify-between gap-5 border border-line bg-white p-5 transition hover:border-ruby" href="/admin/settings/emails">
          <span className="flex items-start gap-4"><Mail className="mt-1 shrink-0 text-ruby" size={23} /><span><strong className="block font-redhat text-base">E-maily objednávek</strong><span className="mt-1 block font-redhat text-sm text-muted">Texty potvrzení, odeslání a doručení včetně žádosti o hodnocení.</span></span></span><ChevronRight size={20} />
        </Link>
        <Link className="mt-4 flex max-w-2xl items-center justify-between gap-5 border border-line bg-white p-5 transition hover:border-ruby" href="/admin/settings/fakturoid">
          <span className="flex items-start gap-4"><Calculator className="mt-1 shrink-0 text-ruby" size={23} /><span><strong className="block font-redhat text-base">Fakturace ve Fakturoidu</strong><span className="mt-1 block font-redhat text-sm text-muted">Automatické vystavení, evidence a odesílání faktur k objednávkám.</span></span></span><ChevronRight size={20} />
        </Link>
        <Link className="mt-4 flex max-w-2xl items-center justify-between gap-5 border border-line bg-white p-5 transition hover:border-ruby" href="/admin/settings/loyalty">
          <span className="flex items-start gap-4"><Crown className="mt-1 shrink-0 text-ruby" size={23} /><span><strong className="block font-redhat text-base">Věrnostní program</strong><span className="mt-1 block font-redhat text-sm text-muted">Procentní odměna na další nákup, hranice a platnost.</span></span></span><ChevronRight size={20} />
        </Link>
        <Link className={`mt-4 flex max-w-2xl items-center justify-between gap-5 border bg-white p-5 transition hover:border-ruby ${maintenance.enabled ? "border-amber-400" : "border-line"}`} href="/admin/settings/maintenance">
          <span className="flex items-start gap-4"><Wrench className="mt-1 shrink-0 text-ruby" size={23} /><span><strong className="block font-redhat text-base">Režim údržby</strong><span className="mt-1 block font-redhat text-sm text-muted">Dočasné skrytí veřejného e-shopu s vlastním sdělením zákazníkům.</span></span></span><span className="flex items-center gap-3"><span className={`font-redhat text-xs font-bold uppercase ${maintenance.enabled ? "text-amber-700" : "text-emerald-700"}`}>{maintenance.enabled ? "Aktivní" : "Web online"}</span><ChevronRight size={20} /></span>
        </Link>
        {query.saved === "1" ? <p className="mt-5 border border-ruby/30 bg-blush p-4 font-redhat text-sm font-semibold text-ruby" role="status">Nastavení Zásilkovny bylo uloženo.</p> : null}

        <form action={updatePacketaSettings} className="mt-8 border border-line bg-white p-6">
          <h2 className="font-newsreader text-3xl">Zásilkovna</h2>
          <p className="mt-2 max-w-3xl font-redhat text-sm leading-6 text-muted">Provozní nastavení pro vytváření zásilek, štítků a dobírky.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className={labelClass}>Označení odesílatele<input className={inputClass} defaultValue={settings.senderLabel} name="senderLabel" /><span className="font-normal text-muted">Název, který Zásilkovna přiřadí k zásilce.</span></label>
            <label className={labelClass}>Výchozí podací místo nebo depo<input className={inputClass} defaultValue={settings.defaultHandoverPoint} name="defaultHandoverPoint" /></label>
            <label className={labelClass}>Výchozí hmotnost zásilky v kg<input className={inputClass} defaultValue={settings.defaultWeightKg} max="30" min="0.01" name="defaultWeightKg" step="0.01" type="number" /></label>
            <div />
            <label className={labelClass}>Kód služby pro doručení na adresu v Česku<input className={inputClass} defaultValue={settings.homeCarrierIdCz} inputMode="numeric" name="homeCarrierIdCz" pattern="[0-9]*" /><span className="font-normal text-muted">Technický kód služby přidělený Zásilkovnou.</span></label>
            <label className={labelClass}>Kód služby pro doručení na adresu na Slovensku<input className={inputClass} defaultValue={settings.homeCarrierIdSk} inputMode="numeric" name="homeCarrierIdSk" pattern="[0-9]*" /><span className="font-normal text-muted">Technický kód služby přidělený Zásilkovnou.</span></label>
          </div>

          <h3 className="mt-8 font-redhat text-sm font-semibold uppercase text-ruby">Ověřená podpora dobírky</h3>
          <p className="mt-2 font-redhat text-sm text-muted">Zaškrtněte až po ověření konkrétní služby v účtu Zásilkovny. Neověřená možnost se zákazníkovi při objednávce nenabídne.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {(["CZ", "SK"] as const).map((country) => (
              <fieldset className="border border-line p-4" key={country}>
                <legend className="px-2 font-redhat text-sm font-semibold">{country === "CZ" ? "Česko" : "Slovensko"}</legend>
                <div className="grid gap-3 font-redhat text-sm">
                  <label className="flex items-center gap-3"><input defaultChecked={settings.cod[country].pickup} name={`cod${country === "CZ" ? "Cz" : "Sk"}Pickup`} type="checkbox" />Výdejní místo</label>
                  <label className="flex items-center gap-3"><input defaultChecked={settings.cod[country].zbox} name={`cod${country === "CZ" ? "Cz" : "Sk"}Zbox`} type="checkbox" />Z-BOX</label>
                  <label className="flex items-center gap-3"><input defaultChecked={settings.cod[country].home} name={`cod${country === "CZ" ? "Cz" : "Sk"}Home`} type="checkbox" />Doručení na adresu</label>
                </div>
              </fieldset>
            ))}
          </div>
          <button className="mt-7 min-h-11 bg-ruby px-6 font-redhat text-sm font-semibold text-white" type="submit">Uložit nastavení Zásilkovny</button>
        </form>
        <EmailTestSuite orders={emailTestOrders} />
      </main>
    </AdminShell>
  );
}
