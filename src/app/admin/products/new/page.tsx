export default function NewProductPage() {
  return (
    <main className="mx-auto max-w-page px-5 py-10">
      <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Nový produkt</p>
      <h1 className="mt-3 font-newsreader text-5xl">Vytvoření produktu</h1>
      <form className="mt-8 grid gap-5 rounded-brand border border-line bg-white p-6">
        <input className="rounded-brand border border-line px-4 py-3" placeholder="Název česky" />
        <input className="rounded-brand border border-line px-4 py-3" placeholder="SKU" />
        <input className="rounded-brand border border-line px-4 py-3" placeholder="Cena v haléřích" type="number" />
        <textarea className="min-h-28 rounded-brand border border-line px-4 py-3" placeholder="Popis" />
        <button className="rounded-brand bg-ruby px-5 py-3 font-redhat text-sm font-semibold text-white">Uložit návrh</button>
      </form>
    </main>
  );
}
