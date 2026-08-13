import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { defaultLocale, enabledLocales, getAlternatePath, isLocale } from "./i18n/routing";
import { getAppEnvironment } from "./lib/environment";
import { isLocalAdminAccessAllowed } from "./lib/admin/access-policy";
import { getMaintenanceLocale, isApiPath, isLocalDevelopmentHostname, isMaintenanceExemptPath, parseMaintenanceSettings } from "./lib/maintenance";

const handleI18n = createMiddleware({
  locales: enabledLocales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: false,
  alternateLinks: false
});

type CookieToSet = { name: string; value: string; options: CookieOptions };

function withIndexingProtection(response: NextResponse) {
  if (getAppEnvironment() !== "production") response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

async function protectAdmin(request: NextRequest) {
  if (["/admin/login", "/admin/recovery"].includes(request.nextUrl.pathname)) {
    return withIndexingProtection(NextResponse.next());
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (isLocalAdminAccessAllowed(getAppEnvironment(), process.env.ALLOW_LOCAL_ADMIN)) {
      return withIndexingProtection(NextResponse.next());
    }
    return NextResponse.redirect(new URL("/admin/login?error=not-configured", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/admin/login", request.url));
  const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!admin) return NextResponse.redirect(new URL("/admin/login?error=denied", request.url));
  return withIndexingProtection(response);
}

async function maintenanceIsEnabled() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return false;

  try {
    const response = await fetch(`${url}/rest/v1/integration_settings?key=eq.storefront_maintenance&select=value`, {
      headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` },
      cache: "no-store"
    });
    if (!response.ok) return false;
    const rows = await response.json() as Array<{ value?: unknown }>;
    return parseMaintenanceSettings(rows[0]?.value).enabled;
  } catch {
    // A settings outage must never hide a healthy storefront by accident.
    return false;
  }
}

export default async function middleware(request: NextRequest) {
  if (getAppEnvironment() === "production" && request.nextUrl.hostname === "www.amaree.cz") {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.hostname = "amaree.cz";
    return NextResponse.redirect(canonicalUrl, 308);
  }

  if (request.nextUrl.pathname === "/cs/kolekce" || request.nextUrl.pathname.startsWith("/cs/kolekce/")) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.pathname = request.nextUrl.pathname.replace(/^\/cs\/kolekce/, "/cs/sperky");
    return NextResponse.redirect(canonicalUrl, 308);
  }

  if (request.nextUrl.pathname.startsWith("/admin")) return protectAdmin(request);
  if (request.nextUrl.pathname.startsWith("/auth/")) return withIndexingProtection(NextResponse.next());
  if (isMaintenanceExemptPath(request.nextUrl.pathname)) return withIndexingProtection(NextResponse.next());

  if (!isLocalDevelopmentHostname(request.nextUrl.hostname) && await maintenanceIsEnabled()) {
    if (isApiPath(request.nextUrl.pathname)) {
      return NextResponse.json({ error: "storefront_maintenance" }, { status: 503, headers: { "Retry-After": "900", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
    }
    const maintenanceUrl = new URL("/maintenance", request.url);
    maintenanceUrl.searchParams.set("locale", getMaintenanceLocale(request.nextUrl.pathname));
    return withIndexingProtection(NextResponse.redirect(maintenanceUrl));
  }
  if (isApiPath(request.nextUrl.pathname)) return withIndexingProtection(NextResponse.next());
  const requestedLocale = request.nextUrl.pathname.split("/")[1] ?? "";

  if (isLocale(requestedLocale) && !enabledLocales.includes(requestedLocale as (typeof enabledLocales)[number])) {
    const url = request.nextUrl.clone();
    url.pathname = getAlternatePath(defaultLocale, request.nextUrl.pathname);
    return withIndexingProtection(NextResponse.redirect(url, 308));
  }

  return withIndexingProtection(handleI18n(request));
}

export const config = {
  matcher: ["/", "/admin/:path*", "/api/:path*", "/(cs|sk|en|de)/:path*", "/((?!_next|_vercel|.*\\..*).*)"]
};
