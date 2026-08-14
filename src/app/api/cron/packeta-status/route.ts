import { NextResponse } from "next/server";
import { syncPacketaDeliveryStatuses } from "@/lib/shipping/packeta-sync";

export const dynamic = "force-dynamic";

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await syncPacketaDeliveryStatuses());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "packeta_sync_failed" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
