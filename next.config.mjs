import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
