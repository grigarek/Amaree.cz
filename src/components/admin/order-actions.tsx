"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, LoaderCircle, Mail, RefreshCcw } from "lucide-react";
import { orderStatuses, orderStatusLabels, templateForOrderStatus, type AdminOrderStatus, type OrderTemplateKey } from "@/lib/orders/statuses";

export function OrderActions({ orderId, currentStatus }: { orderId: string; currentStatus: AdminOrderStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<AdminOrderStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{ subject: string; text: string; templateKey: OrderTemplateKey } | null>(null);

  async function changeStatus(sendEmail: boolean) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note, sendEmail })
      });
      const result = await response.json() as { error?: string; statusChanged?: boolean; emailStatus?: string };
      if (!response.ok) throw new Error(result.statusChanged ? `Stav byl změněn, ale e-mail selhal: ${result.error}` : result.error ?? "Změna se nezdařila.");
      setMessage(sendEmail ? `Stav uložen. E-mail: ${result.emailStatus ?? "nezpracován"}.` : "Stav uložen bez e-mailu.");
      setNote(""); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Změna se nezdařila."); }
    finally { setBusy(false); }
  }

  async function showPreview() {
    const template = templateForOrderStatus(status);
    if (!template) { setMessage("Pro tento stav není e-mailová šablona."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/email-preview?template=${template}`);
      const result = await response.json() as { subject?: string; text?: string; templateKey?: OrderTemplateKey; error?: string };
      if (!response.ok || !result.subject || !result.text || !result.templateKey) throw new Error(result.error ?? "Náhled nelze zobrazit.");
      setPreview({ subject: result.subject, text: result.text, templateKey: result.templateKey });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Náhled nelze zobrazit."); }
    finally { setBusy(false); }
  }

  async function resend(template: OrderTemplateKey) {
    if (!window.confirm("Opravdu znovu odeslat tuto stavovou zprávu?")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/email-resend`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template }) });
      const result = await response.json() as { status?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "E-mail se nepodařilo odeslat.");
      setMessage(`Ruční odeslání: ${result.status}.`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "E-mail se nepodařilo odeslat."); }
    finally { setBusy(false); }
  }

  return (
    <section className="border-y border-line py-6">
      <h2 className="font-newsreader text-3xl">Změnit stav</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(14rem,0.7fr)_1.3fr]">
        <label className="grid gap-2 font-redhat text-sm font-semibold">Nový stav<select className="min-h-11 border border-line bg-white px-3" onChange={(event) => setStatus(event.target.value as AdminOrderStatus)} value={status}>{orderStatuses.map((item) => <option key={item} value={item}>{orderStatusLabels[item]}</option>)}</select></label>
        <label className="grid gap-2 font-redhat text-sm font-semibold">Poznámka<textarea className="min-h-24 border border-line bg-white px-3 py-2" maxLength={1000} onChange={(event) => setNote(event.target.value)} value={note} /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="inline-flex min-h-11 items-center gap-2 bg-ruby px-5 font-redhat text-sm font-semibold text-white disabled:opacity-50" disabled={busy || status === currentStatus} onClick={() => changeStatus(true)} type="button">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Mail size={17} />}Uložit a odeslat e-mail</button>
        <button className="min-h-11 border border-line bg-white px-5 font-redhat text-sm font-semibold disabled:opacity-50" disabled={busy || status === currentStatus} onClick={() => changeStatus(false)} type="button">Uložit bez e-mailu</button>
        <button className="inline-flex min-h-11 items-center gap-2 border border-line bg-white px-4 font-redhat text-sm font-semibold" disabled={busy} onClick={showPreview} type="button"><Eye size={17} />Náhled e-mailu</button>
      </div>
      {message ? <p className="mt-4 font-redhat text-sm font-semibold" role="status">{message}</p> : null}
      {preview ? <div className="mt-6 border border-line bg-white p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-redhat font-semibold">{preview.subject}</h3><button aria-label="Znovu odeslat" className="p-2 text-ruby" onClick={() => resend(preview.templateKey)} title="Znovu odeslat" type="button"><RefreshCcw size={18} /></button></div><pre className="mt-4 whitespace-pre-wrap font-redhat text-sm leading-6 text-muted">{preview.text}</pre></div> : null}
    </section>
  );
}
