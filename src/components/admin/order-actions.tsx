"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, LoaderCircle, Mail, RefreshCcw } from "lucide-react";
import { selectableOrderStatuses, selectableOrderTemplateKeys, orderStatusLabels, orderTemplateLabels, templateForOrderStatus, type AdminOrderStatus, type OrderTemplateKey } from "@/lib/orders/statuses";
import { emailStatusLabel } from "@/lib/admin/order-display-labels";

export function OrderActions({ orderId, currentStatus }: { orderId: string; currentStatus: AdminOrderStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<AdminOrderStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState<OrderTemplateKey | "">(templateForOrderStatus(currentStatus) ?? "");
  const [preview, setPreview] = useState<{ recipient: string; subject: string; text: string; html: string; templateKey: OrderTemplateKey } | null>(null);
  const [confirmResend, setConfirmResend] = useState<OrderTemplateKey | null>(null);

  async function changeStatus(sendEmail: boolean) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note, sendEmail })
      });
      const result = await response.json() as { error?: string; statusChanged?: boolean; emailStatus?: string };
      if (!response.ok) throw new Error(result.statusChanged ? `Stav byl změněn, ale e-mail selhal: ${result.error}` : result.error ?? "Změna se nezdařila.");
      setMessage(sendEmail ? `Stav uložen. E-mail: ${emailStatusLabel(result.emailStatus ?? "processed")}.` : "Stav uložen bez odeslání e-mailu.");
      setNote(""); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Změna se nezdařila."); }
    finally { setBusy(false); }
  }

  async function showPreview() {
    const selectedTemplate = template || templateForOrderStatus(status);
    if (!selectedTemplate) { setMessage("Vyberte e-mailovou šablonu."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/email-preview?template=${selectedTemplate}`);
      const result = await response.json() as { recipient?: string; subject?: string; text?: string; html?: string; templateKey?: OrderTemplateKey; error?: string };
      if (!response.ok || !result.recipient || !result.subject || !result.text || !result.html || !result.templateKey) throw new Error(result.error ?? "Náhled nelze zobrazit.");
      setPreview({ recipient: result.recipient, subject: result.subject, text: result.text, html: result.html, templateKey: result.templateKey });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Náhled nelze zobrazit."); }
    finally { setBusy(false); }
  }

  async function resend(template: OrderTemplateKey) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/email-resend`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template }) });
      const result = await response.json() as { status?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "E-mail se nepodařilo odeslat.");
      setMessage(`E-mail: ${emailStatusLabel(result.status ?? "processed")}.`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "E-mail se nepodařilo odeslat."); }
    finally { setBusy(false); setConfirmResend(null); }
  }

  return (
    <section className="border-y border-line py-6">
      <h2 className="font-newsreader text-3xl">Změnit stav</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(14rem,0.7fr)_1.3fr]">
        <label className="grid gap-2 font-redhat text-sm font-semibold">Nový stav<select className="min-h-11 border border-line bg-white px-3" onChange={(event) => { const next = event.target.value as AdminOrderStatus; setStatus(next); setTemplate(templateForOrderStatus(next) ?? ""); }} value={status}>{selectableOrderStatuses.map((item) => <option key={item} value={item}>{orderStatusLabels[item]}</option>)}</select></label>
        <label className="grid gap-2 font-redhat text-sm font-semibold">Poznámka<textarea className="min-h-24 border border-line bg-white px-3 py-2" maxLength={1000} onChange={(event) => setNote(event.target.value)} value={note} /></label>
      </div>
      <label className="mt-4 grid max-w-md gap-2 font-redhat text-sm font-semibold">Oznamovací e-mail zákazníkovi<select className="min-h-11 border border-line bg-white px-3" onChange={(event) => setTemplate(event.target.value as OrderTemplateKey)} value={template}><option value="">Neodesílat žádný e-mail</option>{selectableOrderTemplateKeys.map((item) => <option key={item} value={item}>{orderTemplateLabels[item]}</option>)}</select></label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="inline-flex min-h-11 items-center gap-2 bg-ruby px-5 font-redhat text-sm font-semibold text-white disabled:opacity-50" disabled={busy || status === currentStatus} onClick={() => changeStatus(true)} type="button">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Mail size={17} />}Uložit a odeslat e-mail</button>
        <button className="min-h-11 border border-line bg-white px-5 font-redhat text-sm font-semibold disabled:opacity-50" disabled={busy || status === currentStatus} onClick={() => changeStatus(false)} type="button">Uložit bez e-mailu</button>
        <button className="inline-flex min-h-11 items-center gap-2 border border-line bg-white px-4 font-redhat text-sm font-semibold" disabled={busy} onClick={showPreview} type="button"><Eye size={17} />Náhled e-mailu</button>
      </div>
      {message ? <p className="mt-4 font-redhat text-sm font-semibold" role="status">{message}</p> : null}
      {preview ? <div className="mt-6 border border-line bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-redhat text-xs font-semibold uppercase text-ruby">{orderTemplateLabels[preview.templateKey]}</p><h3 className="mt-1 font-redhat font-semibold">{preview.subject}</h3><p className="mt-1 font-redhat text-xs text-muted">Příjemce: {preview.recipient}</p></div>{confirmResend === preview.templateKey ? <div className="flex gap-2"><button className="min-h-10 bg-ruby px-4 font-redhat text-xs font-semibold text-white" disabled={busy} onClick={() => resend(preview.templateKey)} type="button">Potvrdit odeslání</button><button className="min-h-10 border border-line bg-white px-4 font-redhat text-xs font-semibold" disabled={busy} onClick={() => setConfirmResend(null)} type="button">Zrušit</button></div> : <button aria-label="Znovu odeslat" className="inline-flex min-h-10 items-center gap-2 border border-line bg-white px-4 font-redhat text-xs font-semibold text-ruby" onClick={() => setConfirmResend(preview.templateKey)} title="Znovu odeslat" type="button"><RefreshCcw size={16} />Odeslat tento e-mail</button>}</div><details className="mt-4"><summary className="cursor-pointer font-redhat text-sm font-semibold">Textová verze</summary><pre className="mt-3 whitespace-pre-wrap font-redhat text-sm leading-6 text-muted">{preview.text}</pre></details><details className="mt-4" open><summary className="cursor-pointer font-redhat text-sm font-semibold">Vzhled e-mailu</summary><iframe className="mt-3 min-h-96 w-full border border-line bg-white" sandbox="" srcDoc={preview.html} title={`Náhled e-mailu ${preview.subject}`} /></details></div> : null}
    </section>
  );
}
