import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
          },
        ],
      },
    ];
  },
  distDir: process.env.DARB_TEST_DIST || ".next",
  transpilePackages: [
    "@darb-rest/ui",
    "@darb-rest/icons",
    "@darb-rest/design-tokens",
    "@darb-rest/i18n",
    "@darb-rest/config",
    "@darb-rest/types",
    "@darb-rest/supabase",
    "@darb-rest/payments",
  ],
};

export default nextConfig;
