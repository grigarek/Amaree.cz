"use client";

import { CircleAlert, LoaderCircle, MailCheck, Send } from "lucide-react";
import { useState } from "react";

export function EmailTestSuite({ orders }: { orders: Array<{ id: string; orderNumber: string }> }) {
  const [orderId, setOrderId] = useState(orders[0]?.id ?? "");
  const [recipient, setRecipient] = useState("info@amaree.cz");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function send() {
    if (!orderId || !recipient) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/email-tests/order-lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, recipient })
      });
      const result = await response.json() as { sent?: number; total?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Testovací e-maily se nepodařilo odeslat.");
      setMessage(`Odesláno ${result.sent ?? 0} ze ${result.total ?? 3} zpráv na ${recipient}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Testovací e-maily se nepodařilo odeslat.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-8 border border-line bg-white p-6"><div className="flex items-start gap-3"><MailCheck className="mt-1 shrink-0 text-ruby" size={24} /><div><h2 className="font-newsreader text-3xl">Test zákaznických e-mailů</h2><p className="mt-2 max-w-3xl font-redhat text-sm leading-6 text-muted">Slouží ke kontrole vzhledu a textů před jejich použitím u skutečných zákazníků.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="border border-line p-4 font-redhat text-sm"><strong>1. Objednávka přijata</strong><p className="mt-1 text-xs leading-5 text-muted">Potvrzení objednávky a její souhrn.</p></div><div className="border border-line p-4 font-redhat text-sm"><strong>2. Zásilka odeslána</strong><p className="mt-1 text-xs leading-5 text-muted">Zpráva s testovacím odkazem pro sledování.</p></div><div className="border border-line p-4 font-redhat text-sm"><strong>3. Objednávka doručena</strong><p className="mt-1 text-xs leading-5 text-muted">Závěrečná zpráva, případně s žádostí o hodnocení.</p></div></div><div className="mt-5 flex items-start gap-3 bg-blush p-4 font-redhat text-sm leading-6"><CircleAlert className="mt-0.5 shrink-0 text-ruby" size={19} /><p><strong>Jde o skutečné odeslání tří e-mailů.</strong> Všechny přijdou pouze na adresu zadanou níže. Jméno, produkty, ceny a číslo se převezmou z vybrané objednávky. Její stav, zákazník, platba ani zásilka se nezmění; testovací zprávy se pouze zapíší do její historie komunikace.</p></div><div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto]"><label className="grid gap-2 font-redhat text-sm font-semibold">Objednávka použitá jako vzor<select className="min-h-11 border border-line bg-white px-3" disabled={!orders.length} onChange={(event) => setOrderId(event.target.value)} value={orderId}>{orders.map((order) => <option key={order.id} value={order.id}>{order.orderNumber}</option>)}</select></label><label className="grid gap-2 font-redhat text-sm font-semibold">Kam testy poslat<input className="min-h-11 border border-line px-3" onChange={(event) => setRecipient(event.target.value)} type="email" value={recipient} /></label><button className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 bg-ruby px-5 font-redhat text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !orders.length || !recipient} onClick={send} type="button">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Send size={17} />}Odeslat tři testovací e-maily</button></div>{message ? <p className="mt-4 font-redhat text-sm font-semibold" role="status">{message}</p> : null}</section>;
}
