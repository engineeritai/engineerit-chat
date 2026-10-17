import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js", "exceljs"],
  devIndicators: false,
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: {
    "/api/history/[id]/export": [
      "./assets/fonts/NotoSansArabic-Regular.ttf",
      "./assets/fonts/Inter-Regular.ttf",
      "./assets/fonts/Inter-SemiBold.ttf",
      "./public/icon-192.png",
    ],
    "/api/export/pdf": [
      "./assets/fonts/NotoSansArabic-Regular.ttf",
      "./assets/fonts/Inter-Regular.ttf",
      "./assets/fonts/Inter-SemiBold.ttf",
      "./public/icon-192.png",
    ],
    "/api/export/docx": ["./public/icon-192.png"],
    "/api/export/pptx": ["./public/icon-192.png"],
    "/s/[id]/og": [
      "./assets/fonts/NotoSansArabic-Regular.ttf",
      "./assets/fonts/Inter-SemiBold.ttf",
    ],
    "/api/invoices/[id]/pdf": [
      "./assets/fonts/NotoSansArabic-Regular.ttf",
      "./assets/fonts/Inter-Regular.ttf",
      "./assets/fonts/Inter-SemiBold.ttf",
      "./assets/invoice-logo.png",
    ],
    "/api/payments/moyasar/complete": [
      "./assets/fonts/NotoSansArabic-Regular.ttf",
      "./assets/fonts/Inter-Regular.ttf",
      "./assets/fonts/Inter-SemiBold.ttf",
      "./assets/invoice-logo.png",
    ],
    "/api/payments/moyasar/callback": [
      "./assets/fonts/NotoSansArabic-Regular.ttf",
      "./assets/fonts/Inter-Regular.ttf",
      "./assets/fonts/Inter-SemiBold.ttf",
      "./assets/invoice-logo.png",
    ],
    "/api/cron/renewals": [
      "./assets/fonts/NotoSansArabic-Regular.ttf",
      "./assets/fonts/Inter-Regular.ttf",
      "./assets/fonts/Inter-SemiBold.ttf",
      "./assets/invoice-logo.png",
    ],
  },
  async headers() {
    return [
      {
        source: "/.well-known/:path*",
        headers: [{ key: "Content-Type", value: "text/plain" }],
      },
    ];
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
        {
          source: "/.well-known/apple-developer-merchantid-domain-association/",
          destination: "/api/apple-pay/domain-association",
        },
        {
          source: "/.well-known/:path*/",
          destination: "/.well-known/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
