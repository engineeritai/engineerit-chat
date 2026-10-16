import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/invoices/[id]/pdf": ["./assets/fonts/NotoSansArabic-Regular.ttf"],
    "/api/payments/moyasar/complete": ["./assets/fonts/NotoSansArabic-Regular.ttf"],
    "/api/payments/moyasar/callback": ["./assets/fonts/NotoSansArabic-Regular.ttf"],
    "/api/cron/renewals": ["./assets/fonts/NotoSansArabic-Regular.ttf"],
  },
  async redirects() {
    return [
      { source: "/auth/login", destination: "/login", statusCode: 301 },
      { source: "/registration", destination: "/register", statusCode: 301 },
      { source: "/subscription", destination: "/pricing", statusCode: 301 },
      { source: "/enterprise", destination: "/pricing", statusCode: 301 },
    ];
  },
};

export default nextConfig;
