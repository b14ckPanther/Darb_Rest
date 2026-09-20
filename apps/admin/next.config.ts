import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.DARB_TEST_DIST || ".next",
  transpilePackages: [
    "@darb-rest/ui",
    "@darb-rest/icons",
    "@darb-rest/design-tokens",
    "@darb-rest/i18n",
    "@darb-rest/config",
    "@darb-rest/types",
    "@darb-rest/supabase",
  ],
};

export default nextConfig;
