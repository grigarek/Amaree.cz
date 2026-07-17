import { NextResponse } from "next/server";
import { getEnvironmentSafetyReport } from "@/lib/environment";

export const dynamic = "force-dynamic";

export function GET() {
  const report = getEnvironmentSafetyReport();

  return NextResponse.json(
    {
      status: report.ok ? "ok" : "degraded",
      environment: report.environment,
      checks: {
        configuration: report.ok,
        databaseConfigured: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
          process.env.SUPABASE_SERVICE_ROLE_KEY
        ),
        gopayMode: process.env.GOPAY_ENVIRONMENT ?? "disabled",
        packetaMode: process.env.PACKETA_ENVIRONMENT ?? "mock",
        ecomailMode: process.env.ECOMAIL_ENVIRONMENT ?? "disabled"
      },
      problems: report.problems
    },
    {
      status: report.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" }
    }
  );
}
