import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./i18n/routing";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always"
});

export const config = {
  matcher: ["/", "/(cs|en|de)/:path*", "/((?!api|admin|_next|_vercel|.*\\..*).*)"]
};
