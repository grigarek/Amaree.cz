"use client";

import { useState } from "react";
import { FileText, Send } from "lucide-react";

export function FakturoidActions({ orderId, hasDocument, wasSent }: { orderId: string; hasDocument: boolean; wasSent: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run(send: boolean) {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/admin/orders/${orderId}/accounting/fakturoid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ send })
    });
    const payload = await response.json() as { error?: string; status?: string; reason?: string };
    setBusy(false);
    if (!response.ok) return setMessage(payload.error ?? "Akci se nepodařilo dokončit.");
    if (payload.status === "skipped" && payload.reason === "integration_disabled") return setMessage("Propojení s Fakturoidem je zatím vypnuté.");
    if (payload.status === "skipped" && payload.reason === "credentials_missing") return setMessage("Chybí bezpečně uložené přístupové údaje Fakturoidu.");
    if (payload.status === "skipped" && payload.reason === "payment_not_confirmed") return setMessage("Fakturu lze vytvořit až po potvrzení úhrady. U dobírky po doručení zásilky.");
    setMessage(payload.status === "sent" ? "Faktura byla odeslána zákazníkovi." : payload.status === "created" ? "Faktura je vytvořená ve Fakturoidu." : "Požadavek byl přijat.");
    window.location.reload();
  }

  return (
    <div className="mt-4 grid gap-3">
      {!hasDocument ? <button className="flex min-h-11 items-center justify-center gap-2 border border-ruby px-4 font-redhat text-sm font-semibold text-ruby disabled:opacity-50" disabled={busy} onClick={() => run(false)} type="button"><FileText size={17} />Vytvořit fakturu</button> : null}
      {!wasSent ? <button className="flex min-h-11 items-center justify-center gap-2 bg-ruby px-4 font-redhat text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => run(true)} type="button"><Send size={17} />{hasDocument ? "Odeslat fakturu" : "Vytvořit a odeslat"}</button> : null}
      {message ? <p className="font-redhat text-xs leading-5 text-muted" role="status">{message}</p> : null}
    </div>
  );
}
