import { RecoverySessionBridge } from "@/components/admin/recovery-session-bridge";

export default function AdminRecoveryPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <section className="w-full rounded-brand border border-line bg-white p-6 shadow-soft">
        <p className="amaree-wordmark text-3xl">AMARÉE</p>
        <h1 className="mt-6 font-newsreader text-4xl">Nastavení přístupu</h1>
        <div className="mt-4">
          <RecoverySessionBridge />
        </div>
      </section>
    </main>
  );
}
