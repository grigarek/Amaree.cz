import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Administrace | A M A R É E",
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-page items-center justify-between px-5 py-5">
          <Link href="/admin" className="font-newsreader text-2xl tracking-[0.18em]">
            A M A R É E
          </Link>
          <span className="font-redhat text-sm text-muted">{admin.email}</span>
        </div>
      </header>
      {children}
    </div>
  );
}
