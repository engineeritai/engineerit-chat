import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/history/[id]/export": ["./assets/fonts/NotoSansArabic-Regular.ttf"],
  },
};

export default nextConfig;
