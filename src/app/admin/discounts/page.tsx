import Link from "next/link";
import { BadgePercent, CalendarClock, Plus, TicketCheck, TicketX } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { listAdminDiscounts } from "@/lib/admin/discounts";

function formatValue(type: "percent" | "fixed" | "free_shipping", value: number, currency: "CZK" | "EUR" | null) {
  if (type === "free_shipping") return "Doprava zdarma";
  if (type === "percent") return `${value} %`;
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: currency ?? "CZK", maximumFractionDigits: 2 }).format(value);
}

function state(active: boolean, from: string | null, to: string | null) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (!active) return { label: "Vypnutý", className: "bg-stone-100 text-stone-700", icon: TicketX };
  if (from && from > today) return { label: "Naplánovaný", className: "bg-amber-50 text-amber-800", icon: CalendarClock };
  if (to && to < today) return { label: "Ukončený", className: "bg-stone-100 text-stone-700", icon: TicketX };
  return { label: "Aktivní", className: "bg-emerald-50 text-emerald-800", icon: TicketCheck };
}

export default async function AdminDiscountsPage() {
  await requireOrderAdmin();
  const discounts = await listAdminDiscounts();

  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em] text-ruby">Prodej</p>
            <h1 className="mt-3 font-newsreader text-5xl">Slevové kódy</h1>
            <p className="mt-3 max-w-2xl font-redhat text-sm leading-6 text-muted">Vytvářejte časově omezené procentní i pevné slevy. Použití a limity se kontrolují při každé objednávce.</p>
          </div>
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-brand bg-ruby px-5 font-redhat text-sm font-semibold text-white" href="/admin/discounts/new">
            <Plus size={18} /> Nový slevový kód
          </Link>
        </div>

        <div className="mt-8 overflow-x-auto rounded-brand border border-line bg-white">
          <table className="w-full min-w-[800px] border-collapse text-left font-redhat text-sm">
            <thead className="bg-blush text-xs uppercase text-muted">
              <tr><th className="p-4">Název a kód</th><th className="p-4">Sleva</th><th className="p-4">Platnost</th><th className="p-4">Použití</th><th className="p-4">Stav</th></tr>
            </thead>
            <tbody>
              {discounts.map((discount) => {
                const currentState = state(discount.active, discount.validFrom, discount.validTo);
                const StateIcon = currentState.icon;
                return (
                  <tr className="border-t border-line transition hover:bg-blush/40" key={discount.id}>
                    <td className="p-4"><Link className="font-semibold text-ruby hover:underline" href={`/admin/discounts/${discount.id}`}>{discount.internalName}</Link><p className="mt-1 font-mono text-xs text-muted">{discount.code}</p></td>
                    <td className="p-4"><span className="inline-flex items-center gap-2 font-semibold"><BadgePercent className="text-ruby" size={17} />{formatValue(discount.discountType, discount.value, discount.currency)}</span><p className="mt-1 text-xs text-muted">Od {discount.minimumOrderValue.toLocaleString("cs-CZ")} {discount.currency ?? "CZK/EUR"}</p></td>
                    <td className="p-4 text-xs leading-5 text-muted"><p>{discount.validFrom ? `Od ${new Intl.DateTimeFormat("cs-CZ").format(new Date(`${discount.validFrom}T12:00:00Z`))}` : "Bez data začátku"}</p><p>{discount.validTo ? `Do ${new Intl.DateTimeFormat("cs-CZ").format(new Date(`${discount.validTo}T12:00:00Z`))}` : "Bez data konce"}</p></td>
                    <td className="p-4 font-semibold">{discount.usageCount}{discount.usageLimit ? ` / ${discount.usageLimit}` : " / bez limitu"}</td>
                    <td className="p-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${currentState.className}`}><StateIcon size={14} />{currentState.label}</span></td>
                  </tr>
                );
              })}
              {!discounts.length ? <tr className="border-t border-line"><td className="p-10 text-center text-muted" colSpan={5}>Zatím nemáte žádný slevový kód.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </main>
    </AdminShell>
  );
}
