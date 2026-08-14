"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, LoaderCircle, Mail, PackageCheck, Send } from "lucide-react";

export function ShipmentActions({
  orderId,
  isPacketa,
  hasPacket,
  hasTracking,
  isShipped
}: {
  orderId: string;
  isPacketa: boolean;
  hasPacket: boolean;
  hasTracking: boolean;
  isShipped: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function action(name: "create" | "mark-shipped" | "tracking-email") {
    setBusy(name);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/shipment/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: name === "mark-shipped" ? JSON.stringify({ note: "Zásilka předána dopravci Zásilkovna" }) : undefined
      });
      const result = await response.json() as { status?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Akce se nezdařila.");
      setMessage(result.status === "duplicate_ignored" ? "Zásilka již existuje, druhá nebyla vytvořena." : "Akce byla dokončena.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Akce se nezdařila.");
    } finally {
      setBusy(null);
    }
  }

  if (!isPacketa) return <p className="mt-4 text-muted">Tato objednávka nepoužívá dopravu přes Zásilkovnu.</p>;
  const icon = (name: string, fallback: React.ReactNode) => busy === name ? <LoaderCircle className="animate-spin" size={17} /> : fallback;
  const buttonClass = "inline-flex min-h-10 items-center gap-2 border border-line bg-white px-3 font-redhat text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="mt-5 grid gap-2">
      <button className={buttonClass} disabled={Boolean(busy) || hasPacket} onClick={() => action("create")} type="button">{icon("create", <PackageCheck size={17} />)}Vytvořit zásilku</button>
      {hasPacket ? <a className={buttonClass} href={`/api/admin/orders/${orderId}/shipment/label`}><Download size={17} />Stáhnout štítek</a> : <span aria-disabled="true" className={`${buttonClass} opacity-40`}><Download size={17} />Stáhnout štítek</span>}
      <button className={buttonClass} disabled={Boolean(busy) || !hasTracking || isShipped} onClick={() => action("mark-shipped")} type="button">{icon("mark-shipped", <Send size={17} />)}Označit jako odeslanou</button>
      <button className={buttonClass} disabled={Boolean(busy) || !hasTracking} onClick={() => action("tracking-email")} type="button">{icon("tracking-email", <Mail size={17} />)}Odeslat e-mail s trackingem</button>
      {message ? <p className="mt-2 font-redhat text-xs font-semibold text-ruby" role="status">{message}</p> : null}
    </div>
  );
}
