import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminSubscribersPage() {
  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
        <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Administrace</p>
        <h1 className="mt-3 font-newsreader text-5xl">Odběratelé newsletteru</h1>
        <p className="mt-6 max-w-2xl font-redhat text-sm leading-6 text-muted">Tabulka newsletter_subscribers obsahuje e-mail, souhlas, jazyk a datum přihlášení.</p>
      </main>
    </AdminShell>
  );
}
