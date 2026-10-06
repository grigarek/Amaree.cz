import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { getHallmarkSettings, isPublicHallmarkPageReady } from "@/lib/admin/hallmark-settings";
import { updateHallmarkSettings } from "./actions";

const inputClass = "min-h-11 w-full border border-line bg-white px-3 py-2 font-redhat text-sm outline-none focus:border-ruby focus:ring-2 focus:ring-ruby/10";
const labelClass = "grid gap-2 font-redhat text-sm font-semibold";

export default async function HallmarkSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireOrderAdmin();
  const [settings, query] = await Promise.all([getHallmarkSettings(), searchParams]);
  const ready = isPublicHallmarkPageReady(settings);
  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
        <nav className="font-redhat text-xs text-muted"><Link className="hover:text-ruby" href="/admin/settings">Nastavení</Link> / <Link className="hover:text-ruby" href="/admin/settings/legal">Právní údaje</Link> / Puncovní informace</nav>
        <h1 className="mt-4 font-newsreader text-5xl">Puncovní informace</h1>
        <p className="mt-4 max-w-3xl font-redhat text-sm leading-6 text-muted">Veřejná stránka ani odkaz v patičce se nezobrazí, dokud není zapnuté obchodování s drahými kovy, doplněný veřejný text a stránka výslovně povolená.</p>
        {query.saved === "1" ? <p className="mt-5 border border-emerald-200 bg-emerald-50 p-4 font-redhat text-sm font-semibold text-emerald-800" role="status">Puncovní nastavení bylo uloženo.</p> : null}
        {query.error ? <p className="mt-5 border border-red-200 bg-red-50 p-4 font-redhat text-sm font-semibold text-red-800" role="alert">{query.error}</p> : null}
        <div className={`mt-5 border p-4 font-redhat text-sm ${ready ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>{ready ? "Veřejná stránka je připravená k zobrazení." : "Veřejná stránka je nyní bezpečně skrytá."}</div>

        <form action={updateHallmarkSettings} className="mt-8 border border-line bg-white p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 border border-line p-4 font-redhat text-sm font-semibold"><input defaultChecked={settings.tradesPreciousMetals} name="tradesPreciousMetals" type="checkbox" />Obchodujeme s výrobky z drahých kovů</label>
            <label className="flex items-center gap-3 border border-line p-4 font-redhat text-sm font-semibold"><input defaultChecked={settings.assayOfficeRegistered} name="assayOfficeRegistered" type="checkbox" />Registrováni u Puncovního úřadu</label>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className={labelClass}>Registrační číslo nebo poznámka<input className={inputClass} defaultValue={settings.registrationNote} name="registrationNote" /></label>
            <label className={labelClass}>Datum registrace<input className={inputClass} defaultValue={settings.registrationDate} name="registrationDate" type="date" /></label>
            <label className={`${labelClass} md:col-span-2`}>Odkaz na záznam v registru Puncovního úřadu<input className={inputClass} defaultValue={settings.registryUrl} name="registryUrl" placeholder="https://..." type="url" /></label>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <AssetField accept="image/jpeg,image/png,image/webp" currentFilename={settings.hallmarkImageFilename} currentUrl={settings.hallmarkImageUrl} inputName="hallmarkImage" label="Vyobrazení českých puncovních značek" removeName="removeHallmarkImage" />
            <AssetField accept="application/pdf" currentFilename={settings.publicDocumentFilename} currentUrl={settings.publicDocumentUrl} inputName="publicDocument" label="Volitelný veřejný dokument nebo osvědčení (PDF)" removeName="removePublicDocument" />
          </div>
          <label className={`${labelClass} mt-6`}>Veřejný text k puncovním informacím<textarea className={`${inputClass} min-h-64`} defaultValue={settings.publicText} name="publicText" /></label>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 border border-line p-4 font-redhat text-sm font-semibold"><input defaultChecked={settings.publicPageEnabled} name="publicPageEnabled" type="checkbox" />Zobrazovat puncovní informace na webu</label>
            <label className="flex items-center gap-3 border border-line p-4 font-redhat text-sm font-semibold"><input defaultChecked={settings.footerLinkEnabled} name="footerLinkEnabled" type="checkbox" />Vložit odkaz do patičky webu</label>
          </div>
          <button className="mt-7 min-h-11 bg-ruby px-6 font-redhat text-sm font-semibold text-white" type="submit">Uložit puncovní informace</button>
        </form>
      </main>
    </AdminShell>
  );
}

function AssetField({ accept, currentFilename, currentUrl, inputName, label, removeName }: { accept: string; currentFilename: string | null; currentUrl: string | null; inputName: string; label: string; removeName: string }) {
  return <div className="border border-line p-4"><label className={labelClass}>{label}<input accept={accept} className="block w-full font-redhat text-sm" name={inputName} type="file" /></label><p className="mt-2 font-redhat text-xs text-muted">Nejvýše 10 MB. Dokument není povinný.</p>{currentFilename && currentUrl ? <div className="mt-3 flex flex-wrap items-center gap-3 font-redhat text-xs"><a className="inline-flex items-center gap-1 font-semibold text-ruby underline" href={currentUrl} rel="noreferrer" target="_blank">{currentFilename}<ExternalLink size={12} /></a><label className="flex items-center gap-2"><input name={removeName} type="checkbox" />Odstranit při uložení</label></div> : null}</div>;
}
