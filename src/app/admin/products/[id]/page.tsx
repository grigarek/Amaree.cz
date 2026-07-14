import { notFound } from "next/navigation";
import { products } from "@/lib/products";

export default async function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = products.find((item) => item.id === id);
  if (!product) notFound();

  return (
    <main className="mx-auto max-w-page px-5 py-10">
      <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Editace produktu</p>
      <h1 className="mt-3 font-newsreader text-5xl">{product.name.cs}</h1>
      <form className="mt-8 grid gap-5 rounded-brand border border-line bg-white p-6">
        {(["cs", "en", "de"] as const).map((locale) => (
          <fieldset key={locale} className="grid gap-3 border-t border-line pt-5">
            <legend className="font-redhat text-sm font-semibold uppercase text-ruby">{locale}</legend>
            <input className="rounded-brand border border-line px-4 py-3" defaultValue={product.name[locale]} />
            <textarea className="min-h-28 rounded-brand border border-line px-4 py-3" defaultValue={product.longDescription[locale]} />
          </fieldset>
        ))}
        <p className="font-redhat text-sm text-muted">TODO: Napojit uložení na Supabase, upload do Storage a změnu pořadí fotografií.</p>
      </form>
    </main>
  );
}
