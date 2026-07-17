"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";

export function InternalNote({ orderId, initialValue }: { orderId: string; initialValue: string }) {
  const router = useRouter();
  const [note, setNote] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/note`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Poznámku se nepodařilo uložit.");
      setMessage("Uloženo."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Poznámku se nepodařilo uložit."); }
    finally { setBusy(false); }
  }
  return <div className="mt-4"><textarea className="min-h-28 w-full border border-line p-3 font-redhat text-sm" maxLength={4000} onChange={(event) => setNote(event.target.value)} placeholder="Interní poznámka není viditelná zákazníkovi" value={note} /><button className="mt-2 inline-flex min-h-10 items-center gap-2 bg-ruby px-4 font-redhat text-xs font-semibold text-white disabled:opacity-50" disabled={busy} onClick={save} type="button">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}Uložit interní poznámku</button>{message ? <p className="mt-2 text-xs font-semibold text-ruby" role="status">{message}</p> : null}</div>;
}
