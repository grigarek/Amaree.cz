import Link from "next/link";
import { ArrowLeft, ExternalLink, Mail } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { getOrderEmailSettings } from "@/lib/admin/email-template-settings";
import { updateOrderEmailSettings } from "./actions";

const inputClass = "min-h-11 w-full border border-line bg-white px-3 font-redhat text-sm focus:border-ruby focus:outline-none";
const textareaClass = `${inputClass} min-h-24 resize-y py-3 leading-6`;
const labelClass = "grid gap-2 font-redhat text-sm font-semibold";

function TemplateFields({ prefix, title, values }: { prefix: string; title: string; values: { subjectCs: string; statusCs: string; introCs: string; subjectSk: string; statusSk: string; introSk: string } }) {
  return (
    <section className="border border-line bg-white p-5 md:p-6">
      <h2 className="font-newsreader text-3xl">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Předmět e-mailu<input className={inputClass} defaultValue={values.subjectCs} name={`${prefix}SubjectCs`} required /></label>
        <label className={labelClass}>Stav v barevném štítku<input className={inputClass} defaultValue={values.statusCs} name={`${prefix}StatusCs`} required /></label>
        <label className={`${labelClass} md:col-span-2`}>Úvodní text<textarea className={textareaClass} defaultValue={values.introCs} name={`${prefix}IntroCs`} required /></label>
      </div>
      <details className="mt-6 border-t border-line pt-5">
        <summary className="cursor-pointer font-redhat text-sm font-semibold text-ruby">Slovenská verze</summary>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>Predmet e-mailu<input className={inputClass} defaultValue={values.subjectSk} name={`${prefix}SubjectSk`} required /></label>
          <label className={labelClass}>Stav v štítku<input className={inputClass} defaultValue={values.statusSk} name={`${prefix}StatusSk`} required /></label>
          <label className={`${labelClass} md:col-span-2`}>Úvodný text<textarea className={textareaClass} defaultValue={values.introSk} name={`${prefix}IntroSk`} required /></label>
        </div>
      </details>
    </section>
  );
}

export default async function EmailSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireOrderAdmin();
  const [settings, query] = await Promise.all([getOrderEmailSettings(), searchParams]);
  return (
    <AdminShell>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Link className="inline-flex items-center gap-2 font-redhat text-sm font-semibold text-muted hover:text-ruby" href="/admin/settings"><ArrowLeft size={17} />Zpět na nastavení</Link>
        <div className="mt-6 flex items-start gap-4"><Mail className="mt-1 text-ruby" size={28} /><div><p className="font-redhat text-sm font-semibold uppercase text-ruby">Nastavení</p><h1 className="mt-2 font-newsreader text-5xl">E-maily objednávek</h1></div></div>
        <p className="mt-5 max-w-3xl font-redhat text-sm leading-6 text-muted">Zde upravujete tři hlavní zprávy, které zákazník dostává během vyřízení objednávky. Vzhled, údaje objednávky, produktové fotografie a součty doplňuje systém automaticky.</p>
        {query.saved === "1" ? <p className="mt-6 border border-emerald-200 bg-emerald-50 p-4 font-redhat text-sm font-semibold text-emerald-800" role="status">E-mailové šablony byly uloženy.</p> : null}
        {query.error ? <p className="mt-6 border border-red-200 bg-red-50 p-4 font-redhat text-sm font-semibold text-red-800" role="alert">{query.error}</p> : null}

        <form action={updateOrderEmailSettings} className="mt-8 grid gap-5">
          <TemplateFields prefix="received" title="1. Potvrzení přijetí objednávky" values={settings.templates.order_received} />
          <TemplateFields prefix="shipped" title="2. Zásilka byla předána dopravci" values={settings.templates.order_shipped} />
          <TemplateFields prefix="delivered" title="3. Objednávka byla doručena" values={settings.templates.order_delivered} />
          <section className="border border-line bg-white p-5 md:p-6">
            <h2 className="font-newsreader text-3xl">Žádost o Google hodnocení</h2>
            <p className="mt-2 max-w-3xl font-redhat text-sm leading-6 text-muted">Zobrazí se pouze v e-mailu po doručení. Nechte ji vypnutou, dokud Google profil neposkytne konečný HTTPS odkaz.</p>
            <label className="mt-5 flex items-center gap-3 font-redhat text-sm font-semibold"><input defaultChecked={settings.review.enabled} name="reviewEnabled" type="checkbox" />Zobrazovat žádost po doručení</label>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className={`${labelClass} md:col-span-2`}>Google odkaz<div className="flex"><input className={inputClass} defaultValue={settings.review.url} name="reviewUrl" placeholder="https://g.page/r/.../review" type="url" /><ExternalLink className="-ml-9 mt-3 text-muted" size={17} /></div></label>
              <label className={labelClass}>Nadpis<input className={inputClass} defaultValue={settings.review.headingCs} name="reviewHeadingCs" required /></label>
              <label className={labelClass}>Text tlačítka<input className={inputClass} defaultValue={settings.review.buttonCs} name="reviewButtonCs" required /></label>
              <label className={`${labelClass} md:col-span-2`}>Text žádosti<textarea className={textareaClass} defaultValue={settings.review.textCs} name="reviewTextCs" required /></label>
            </div>
            <details className="mt-6 border-t border-line pt-5">
              <summary className="cursor-pointer font-redhat text-sm font-semibold text-ruby">Slovenská verze žádosti</summary>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className={labelClass}>Nadpis<input className={inputClass} defaultValue={settings.review.headingSk} name="reviewHeadingSk" required /></label>
                <label className={labelClass}>Text tlačidla<input className={inputClass} defaultValue={settings.review.buttonSk} name="reviewButtonSk" required /></label>
                <label className={`${labelClass} md:col-span-2`}>Text žiadosti<textarea className={textareaClass} defaultValue={settings.review.textSk} name="reviewTextSk" required /></label>
              </div>
            </details>
          </section>
          <div className="sticky bottom-4 flex justify-end border border-line bg-white/95 p-4 shadow-lg backdrop-blur"><button className="min-h-11 bg-ruby px-7 font-redhat text-sm font-semibold text-white hover:bg-ruby/90" type="submit">Uložit e-mailové šablony</button></div>
        </form>
      </main>
    </AdminShell>
  );
}
