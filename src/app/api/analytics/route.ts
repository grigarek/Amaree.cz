import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const validLocales = new Set(["cs", "sk"]);
const validEvents = new Set(["page_view", "page_engagement"]);

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== requestUrl.host) {
        return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
    }
  }

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const eventType = String(body.eventType ?? "");
  const sessionId = String(body.sessionId ?? "");
  const locale = String(body.locale ?? "");
  const path = String(body.path ?? "").split("?")[0];
  const durationSeconds = Math.max(0, Math.min(86400, Math.round(Number(body.durationSeconds ?? 0))));
  const referrerHost = body.referrerHost ? String(body.referrerHost).slice(0, 255) : null;
  if (!validEvents.has(eventType) || !validLocales.has(locale) || !/^[0-9a-f-]{36}$/i.test(sessionId) || !path.startsWith(`/${locale}`) || path.length > 500) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("storefront_analytics_events").insert({
    event_type: eventType,
    session_id: sessionId,
    locale,
    path,
    duration_seconds: eventType === "page_engagement" ? durationSeconds : 0,
    referrer_host: referrerHost
  });
  return error ? NextResponse.json({ error: "analytics_unavailable" }, { status: 503 }) : new NextResponse(null, { status: 204 });
}
