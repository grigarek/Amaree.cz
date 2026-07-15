import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-page items-center justify-between px-5 py-5">
          <Link href="/admin" className="font-newsreader text-2xl tracking-[0.18em]">
            A M A R É E
          </Link>
          <span className="font-redhat text-sm text-muted">{admin.email}</span>
        </div>
      </header>
      {children}
    </>
  );
}
