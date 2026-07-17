import { redirect } from "next/navigation";
import { setAdminPassword } from "@/app/admin/set-password/actions";
import { getAdminSession } from "@/lib/admin/session";

const errors: Record<string, string> = {
  length: "Heslo musí mít alespoň 12 znaků.",
  mismatch: "Zadaná hesla se neshodují.",
  update: "Heslo se nepodařilo uložit. Zkuste to prosím znovu."
};

export default async function SetAdminPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await getAdminSession())) redirect("/admin/login");
  const { error } = await searchParams;

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <form action={setAdminPassword} className="w-full rounded-brand border border-line bg-white p-6 shadow-soft">
        <p className="amaree-wordmark text-3xl">AMARÉE</p>
        <h1 className="mt-6 font-newsreader text-4xl">Nastavení hesla</h1>
        <p className="mt-4 font-redhat text-sm leading-6 text-muted">
          Zvolte si vlastní heslo pro zabezpečený přístup do administrace.
        </p>
        {error ? <p className="mt-4 font-redhat text-sm font-semibold text-red-700" role="alert">{errors[error] ?? errors.update}</p> : null}
        <label className="mt-6 block font-redhat text-sm font-semibold" htmlFor="admin-password">Nové heslo</label>
        <input autoComplete="new-password" className="mt-2 w-full rounded-brand border border-line px-4 py-3" id="admin-password" minLength={12} name="password" required type="password" />
        <label className="mt-4 block font-redhat text-sm font-semibold" htmlFor="admin-password-confirmation">Potvrzení hesla</label>
        <input autoComplete="new-password" className="mt-2 w-full rounded-brand border border-line px-4 py-3" id="admin-password-confirmation" minLength={12} name="passwordConfirmation" required type="password" />
        <button className="mt-5 w-full rounded-brand bg-ruby px-5 py-3 font-redhat text-sm font-semibold text-white" type="submit">
          Uložit heslo a pokračovat
        </button>
      </form>
    </main>
  );
}
