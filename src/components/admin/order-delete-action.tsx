"use client";

import { LoaderCircle, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderDeleteAction({
  orderId,
  orderNumber,
  canDelete
}: {
  orderId: string;
  orderNumber: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function deleteOrder() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation })
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Objednávku se nepodařilo smazat.");
      router.replace("/admin/orders?deleted=1");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Objednávku se nepodařilo smazat.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div>
        <button
          className="inline-flex min-h-11 items-center gap-2 border border-ruby bg-white px-4 font-redhat text-sm font-semibold text-ruby disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canDelete}
          onClick={() => setOpen(true)}
          type="button"
        >
          <Trash2 size={17} />
          Smazat objednávku
        </button>
        {!canDelete ? <p className="mt-2 text-xs text-muted">Nejdříve změňte stav objednávky na Zrušeno.</p> : null}
      </div>
    );
  }

  return (
    <div className="border border-ruby bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-redhat text-sm font-semibold text-ruby">Trvalé smazání</h3>
          <p className="mt-2 text-xs leading-5 text-muted">
            Tuto možnost používejte jen pro testovací nebo chybně vytvořené objednávky. Zaplacené, skladově vyřízené či odeslané objednávky systém smazat nepovolí.
          </p>
        </div>
        <button aria-label="Zavřít" className="p-1 text-muted" disabled={busy} onClick={() => setOpen(false)} type="button">
          <X size={18} />
        </button>
      </div>
      <label className="mt-4 grid gap-2 text-xs font-semibold">
        Pro potvrzení opište {orderNumber}
        <input
          autoComplete="off"
          className="min-h-11 border border-line px-3 font-redhat text-sm font-normal"
          onChange={(event) => setConfirmation(event.target.value)}
          value={confirmation}
        />
      </label>
      <button
        className="mt-3 inline-flex min-h-11 items-center gap-2 bg-ruby px-4 font-redhat text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        disabled={busy || confirmation !== orderNumber}
        onClick={deleteOrder}
        type="button"
      >
        {busy ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}
        Trvale smazat
      </button>
      {message ? <p className="mt-3 text-xs font-semibold text-ruby" role="alert">{message}</p> : null}
    </div>
  );
}
