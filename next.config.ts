import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/history/[id]/export": ["./assets/fonts/NotoSansArabic-Regular.ttf"],
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
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/.well-known/apple-developer-merchantid-domain-association",
          destination: "/api/apple-pay/domain-association",
        },
      ],
    };
  },
};

export default nextConfig;
