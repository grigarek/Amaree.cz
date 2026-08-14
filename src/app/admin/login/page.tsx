import { redirect } from "next/navigation";
import { loginAdmin } from "@/app/admin/login/actions";
import { getAdminSession } from "@/lib/admin/session";

const errors: Record<string, string> = {
  invalid: "E-mail nebo heslo není správné.",
  denied: "Tento účet nemá schválený přístup do administrace.",
  "not-configured": "Vývojový Supabase ještě není připojen."
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAdminSession()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <form action={loginAdmin} className="w-full rounded-brand border border-line bg-white p-6 shadow-soft">
        <p className="amaree-wordmark text-3xl">AMARÉE</p>
        <h1 className="mt-6 font-newsreader text-4xl">Přihlášení správce</h1>
        <p className="mt-4 font-redhat text-sm leading-6 text-muted">Přístup je dostupný pouze účtům pozvaným v Supabase Auth a schváleným v seznamu administrátorů.</p>
        {error ? <p className="mt-4 font-redhat text-sm font-semibold text-red-700" role="alert">{errors[error] ?? "Přihlášení se nezdařilo."}</p> : null}
        <label className="sr-only" htmlFor="admin-email">E-mail</label>
        <input autoComplete="username" className="mt-6 w-full rounded-brand border border-line px-4 py-3" id="admin-email" name="email" placeholder="E-mail" required type="email" />
        <label className="sr-only" htmlFor="admin-password">Heslo</label>
        <input autoComplete="current-password" className="mt-3 w-full rounded-brand border border-line px-4 py-3" id="admin-password" minLength={10} name="password" placeholder="Heslo" required type="password" />
        <button className="mt-4 w-full rounded-brand bg-ruby px-5 py-3 font-redhat text-sm font-semibold text-white" type="submit">Přihlásit se</button>
      </form>
    </main>
  );
}
