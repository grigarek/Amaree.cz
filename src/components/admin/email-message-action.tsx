"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, RefreshCcw } from "lucide-react";
import type { OrderTemplateKey } from "@/lib/orders/statuses";
import { emailStatusLabel } from "@/lib/admin/order-display-labels";

export function EmailMessageAction({ orderId, messageId, template, failed }: { orderId: string; messageId: string; template: OrderTemplateKey; failed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function resend() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/email-resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(failed ? { messageId } : { template })
      });
      const result = await response.json() as { status?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Odeslání se nezdařilo.");
      setMessage(`E-mail: ${emailStatusLabel(result.status ?? "processed")}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Odeslání se nezdařilo.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return <div className="mt-4">{confirming ? <div className="flex flex-wrap gap-2"><button className="min-h-10 bg-ruby px-4 font-redhat text-xs font-semibold text-white disabled:opacity-50" disabled={busy} onClick={resend} type="button">{busy ? <LoaderCircle className="animate-spin" size={15} /> : null}Potvrdit odeslání</button><button className="min-h-10 border border-line bg-white px-4 font-redhat text-xs font-semibold" disabled={busy} onClick={() => setConfirming(false)} type="button">Zrušit</button></div> : <button className="inline-flex min-h-10 items-center gap-2 border border-line bg-white px-4 font-redhat text-xs font-semibold text-ruby disabled:opacity-50" disabled={busy} onClick={() => setConfirming(true)} type="button"><RefreshCcw size={15} />{failed ? "Opakovat neúspěšné odeslání" : "Odeslat znovu"}</button>}{message ? <p className="mt-2 text-xs font-semibold" role="status">{message}</p> : null}</div>;
}
