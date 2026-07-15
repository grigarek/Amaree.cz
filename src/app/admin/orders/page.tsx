import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminOrdersPage() {
  return (
    <AdminShell>
      <AdminPlaceholder title="Objednávky" body="Seznam objednávek, detail objednávky a změna stavů jsou připraveny pro napojení na Supabase tabulky orders a order_items." />
    </AdminShell>
  );
}

function AdminPlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto max-w-page px-5 py-10">
      <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Administrace</p>
      <h1 className="mt-3 font-newsreader text-5xl">{title}</h1>
      <p className="mt-6 max-w-2xl font-redhat text-sm leading-6 text-muted">{body}</p>
    </main>
  );
}
