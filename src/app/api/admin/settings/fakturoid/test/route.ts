import { NextResponse } from "next/server";
import { FakturoidClient, getFakturoidConfig } from "@/lib/accounting/fakturoid-client";
import { getAdminSession } from "@/lib/admin/session";

export async function POST() {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Tuto kontrolu může provést pouze administrátor." }, { status: 403 });
  }
  if (process.env.FAKTUROID_API_ENABLED !== "true") {
    return NextResponse.json({ error: "Serverové propojení s Fakturoidem je vypnuté." }, { status: 503 });
  }
  const config = getFakturoidConfig();
  if (!config) {
    return NextResponse.json({ error: "Chybí bezpečně uložené přístupové údaje Fakturoidu." }, { status: 503 });
  }

  try {
    const account = await new FakturoidClient(config).getAccountStatus();
    return NextResponse.json({
      connected: true,
      account: {
        name: account.name,
        registrationNumber: account.registration_no,
        vatMode: account.vat_mode,
        currency: account.currency,
        plan: account.plan,
        apiCallsUsed: account.api_calls_used,
        apiCallsLimit: account.api_calls_limit
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Spojení s Fakturoidem se nepodařilo ověřit."
    }, { status: 502 });
  }
}
