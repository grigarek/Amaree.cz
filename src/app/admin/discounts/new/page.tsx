import { AdminShell } from "@/components/admin/admin-shell";
import { DiscountForm } from "@/components/admin/discount-form";
import { requireOrderAdmin } from "@/lib/admin-auth";

export default async function NewDiscountPage() {
  await requireOrderAdmin();
  return <AdminShell><main className="mx-auto max-w-page px-5 py-10"><p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Slevové kódy</p><h1 className="mt-3 font-newsreader text-4xl sm:text-5xl">Nový slevový kód</h1><DiscountForm initial={{ internalName: "", code: "", discountType: "percent", value: 10, currency: "CZK", minimumOrderValue: 0, usageLimit: null, active: false, validFrom: null, validTo: null }} /></main></AdminShell>;
}
