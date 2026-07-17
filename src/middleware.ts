import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { defaultLocale, enabledLocales, getAlternatePath, isLocale } from "./i18n/routing";
import { getAppEnvironment } from "./lib/environment";
import { isLocalAdminAccessAllowed } from "./lib/admin/access-policy";

const handleI18n = createMiddleware({
  locales: enabledLocales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: false
});

type CookieToSet = { name: string; value: string; options: CookieOptions };

function withIndexingProtection(response: NextResponse) {
  if (getAppEnvironment() !== "production") response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

async function protectAdmin(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return withIndexingProtection(NextResponse.next());

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

export default async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) return protectAdmin(request);
  const requestedLocale = request.nextUrl.pathname.split("/")[1] ?? "";

  if (isLocale(requestedLocale) && requestedLocale !== defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = getAlternatePath(defaultLocale, request.nextUrl.pathname);
    return withIndexingProtection(NextResponse.redirect(url, 308));
  }

  return withIndexingProtection(handleI18n(request));
}

export const config = {
  matcher: ["/", "/admin/:path*", "/(cs|en|de)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"]
};
