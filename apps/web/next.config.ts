import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:locale/q/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/:locale/order/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
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
