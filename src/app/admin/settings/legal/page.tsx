import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireOrderAdmin } from "@/lib/admin-auth";

export default async function LegalSettingsPage() {
  await requireOrderAdmin();
  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
        <p className="font-redhat text-sm font-semibold uppercase text-ruby">Nastavení</p>
        <h1 className="mt-3 font-newsreader text-5xl">Právní údaje</h1>
        <p className="mt-4 max-w-3xl font-redhat text-sm leading-6 text-muted">Správa údajů, které mohou být po ověření zveřejněny na samostatných informačních stránkách e-shopu.</p>
        <Link className="mt-8 flex max-w-2xl items-center justify-between gap-5 border border-line bg-white p-5 transition hover:border-ruby" href="/admin/settings/legal/hallmarks">
          <span className="flex items-start gap-4"><ShieldCheck className="mt-1 shrink-0 text-ruby" size={24} /><span><strong className="block font-redhat text-base">Puncovní informace</strong><span className="mt-1 block font-redhat text-sm leading-6 text-muted">Registrace, české puncovní značky, veřejné podklady a řízené zobrazení v patičce.</span></span></span>
          <ChevronRight aria-hidden="true" size={20} />
        </Link>
      </main>
    </AdminShell>
  );
}
