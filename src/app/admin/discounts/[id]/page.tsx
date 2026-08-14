import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { DiscountForm } from "@/components/admin/discount-form";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { getAdminDiscount } from "@/lib/admin/discounts";

export default async function DiscountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrderAdmin();
  const { id } = await params;
  const discount = await getAdminDiscount(id);
  if (!discount) notFound();
  return <AdminShell><main className="mx-auto max-w-page px-5 py-10"><p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Slevové kódy</p><h1 className="mt-3 font-newsreader text-4xl sm:text-5xl">{discount.internalName}</h1><DiscountForm initial={discount} /></main></AdminShell>;
}
