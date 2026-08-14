import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { logoutAdmin } from "@/app/admin/login/actions";

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-page items-center justify-between gap-5 px-5 py-5">
          <Link href="/admin" className="amaree-wordmark text-2xl">
            AMARÉE
          </Link>
          <nav className="hidden items-center gap-6 font-redhat text-sm font-semibold md:flex">
            <Link className="hover:text-ruby" href="/admin">Přehled</Link>
            <Link className="hover:text-ruby" href="/admin/products">Produkty</Link>
            {admin.role === "admin" ? <Link className="hover:text-ruby" href="/admin/orders">Objednávky</Link> : null}
            {admin.role === "admin" ? <Link className="hover:text-ruby" href="/admin/discounts">Slevy</Link> : null}
            {admin.role === "admin" ? <Link className="hover:text-ruby" href="/admin/customers">Zákazníci</Link> : null}
            {admin.role === "admin" ? <Link className="hover:text-ruby" href="/admin/settings">Nastavení</Link> : null}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden font-redhat text-xs text-muted sm:inline">{admin.email} · {admin.role}</span>
            <form action={logoutAdmin}>
              <button aria-label="Odhlásit se" className="p-2 text-ink transition hover:text-ruby" title="Odhlásit se" type="submit"><LogOut size={19} /></button>
            </form>
          </div>
        </div>
        <nav aria-label="Administrace" className="mx-auto flex max-w-page gap-5 overflow-x-auto border-t border-line px-5 py-3 font-redhat text-sm font-semibold md:hidden">
          <Link className="shrink-0 hover:text-ruby" href="/admin">Přehled</Link>
          <Link className="shrink-0 hover:text-ruby" href="/admin/products">Produkty</Link>
          {admin.role === "admin" ? <Link className="shrink-0 hover:text-ruby" href="/admin/orders">Objednávky</Link> : null}
          {admin.role === "admin" ? <Link className="shrink-0 hover:text-ruby" href="/admin/discounts">Slevy</Link> : null}
          {admin.role === "admin" ? <Link className="shrink-0 hover:text-ruby" href="/admin/customers">Zákazníci</Link> : null}
          {admin.role === "admin" ? <Link className="shrink-0 hover:text-ruby" href="/admin/settings">Nastavení</Link> : null}
        </nav>
      </header>
      {children}
    </>
  );
}
