"use client";

import { useState } from "react";
import { CheckCircle2, PlugZap } from "lucide-react";

type AccountStatus = {
  name: string;
  registrationNumber: string;
  vatMode: "vat_payer" | "non_vat_payer" | "identified_person";
  currency: string;
  plan: string;
  apiCallsUsed: number;
  apiCallsLimit: number;
};

const vatLabels: Record<AccountStatus["vatMode"], string> = {
  vat_payer: "Plátce DPH",
  non_vat_payer: "Neplátce DPH",
  identified_person: "Identifikovaná osoba"
};

export function FakturoidConnectionTest() {
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<AccountStatus | null>(null);
  const [error, setError] = useState("");

  async function testConnection() {
    setBusy(true);
    setError("");
    setAccount(null);
    const response = await fetch("/api/admin/settings/fakturoid/test", { method: "POST" });
    const payload = await response.json() as { account?: AccountStatus; error?: string };
    setBusy(false);
    if (!response.ok || !payload.account) {
      setError(payload.error ?? "Spojení s Fakturoidem se nepodařilo ověřit.");
      return;
    }
    setAccount(payload.account);
  }

  return (
    <section className="mt-7 border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-redhat text-sm font-semibold">Kontrola spojení</h2>
          <p className="mt-1 font-redhat text-xs leading-5 text-muted">Pouze načte údaje účtu. Nevytvoří fakturu ani neodešle e-mail.</p>
        </div>
        <button className="flex min-h-11 items-center gap-2 border border-ruby px-4 font-redhat text-sm font-semibold text-ruby disabled:opacity-50" disabled={busy} onClick={testConnection} type="button">
          <PlugZap size={17} />{busy ? "Ověřuji..." : "Ověřit spojení"}
        </button>
      </div>
      {account ? (
        <div className="mt-5 border border-emerald-300 bg-emerald-50 p-4 font-redhat text-sm" role="status">
          <p className="flex items-center gap-2 font-semibold text-emerald-800"><CheckCircle2 size={18} />Spojení funguje</p>
          <p className="mt-2 text-muted">{account.name} · IČO {account.registrationNumber || "neuvedeno"} · {vatLabels[account.vatMode]} · {account.currency}</p>
          <p className="mt-1 text-xs text-muted">Tarif: {account.plan} · API požadavky: {account.apiCallsUsed} / {account.apiCallsLimit}</p>
        </div>
      ) : null}
      {error ? <p className="mt-4 border border-red-300 bg-red-50 p-4 font-redhat text-sm text-red-800" role="alert">{error}</p> : null}
    </section>
  );
}
