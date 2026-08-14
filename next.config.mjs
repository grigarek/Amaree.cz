import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const isCloudflareBuild = process.env.DEPLOY_TARGET === "cloudflare";
const isProductionBuild = process.env.APP_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    // Storefront editors accept an original image up to 12 MB. Multipart
    // encoding and the accompanying localized copy need some extra room.
    serverActions: {
      bodySizeLimit: "16mb"
    }
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(isProductionBuild
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : [])
        ]
      }
    ];
  },
  images: {
    // Avoid the separately billed Cloudflare Images binding during the initial free phase.
    unoptimized: isCloudflareBuild,
    qualities: [75, 95],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "364fec5f17.cbaul-cdnwnd.com"
      },
      {
        protocol: "https",
        hostname: "duyn491kcolsw.cloudfront.net"
      },
      {
        protocol: "https",
        hostname: "*.supabase.co"
      }
    ]
  }
};

export default withNextIntl(nextConfig);
