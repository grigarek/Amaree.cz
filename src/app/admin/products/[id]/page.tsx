import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { products } from "@/lib/products";

export default async function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = products.find((item) => item.id === id);
  if (!product) notFound();

  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
      <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Editace produktu</p>
      <h1 className="mt-3 font-newsreader text-5xl">{product.name.cs}</h1>
      <div className="mt-8 grid gap-5 rounded-brand border border-line bg-white p-6" role="group">
        {(["cs", "en", "de"] as const).map((locale) => (
          <fieldset key={locale} className="grid gap-3 border-t border-line pt-5">
            <legend className="font-redhat text-sm font-semibold uppercase text-ruby">{locale}</legend>
            <label className="sr-only" htmlFor={`product-name-${locale}`}>Název produktu ({locale})</label>
            <input className="rounded-brand border border-line px-4 py-3" defaultValue={product.name[locale]} id={`product-name-${locale}`} name={`name-${locale}`} />
            <label className="sr-only" htmlFor={`product-description-${locale}`}>Popis produktu ({locale})</label>
            <textarea className="min-h-28 rounded-brand border border-line px-4 py-3" defaultValue={product.longDescription[locale]} id={`product-description-${locale}`} name={`description-${locale}`} />
          </fieldset>
        ))}
        <p className="font-redhat text-sm text-muted">TODO: Napojit uložení na Supabase, upload do Storage a změnu pořadí fotografií.</p>
      </div>
      </main>
    </AdminShell>
  );
}
