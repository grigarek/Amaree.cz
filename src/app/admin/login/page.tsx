export default function AdminLoginPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <form className="w-full rounded-brand border border-line bg-white p-6 shadow-soft">
        <p className="font-newsreader text-3xl tracking-[0.18em]">A M A R É E</p>
        <h1 className="mt-6 font-newsreader text-4xl">Přihlášení správce</h1>
        <p className="mt-4 font-redhat text-sm leading-6 text-muted">Produkční přihlášení používá Supabase Authentication. Formulář je připravený pro magic link nebo e-mail a heslo.</p>
        <input className="mt-6 w-full rounded-brand border border-line px-4 py-3" placeholder="E-mail" type="email" />
        <button className="mt-4 w-full rounded-brand bg-ruby px-5 py-3 font-redhat text-sm font-semibold text-white">Pokračovat</button>
      </form>
    </main>
  );
}
