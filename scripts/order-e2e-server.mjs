import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
const status = JSON.parse(
  execFileSync("supabase", ["status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(status.API_URL))
  throw Error("Local Supabase required");
const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "dev", "-p", "3100"],
  {
    cwd: new URL("../apps/web", import.meta.url),
    env: {
      ...process.env,
      NODE_ENV: "development",
      TRANSACTIONAL_EMAIL_PROVIDER: "",
      RESEND_API_KEY: "",
      TRANSACTIONAL_EMAIL_ENDPOINT: "",
      TRANSACTIONAL_EMAIL_TOKEN: "",
      NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
      DARB_TEST_DIST: ".next-phase5",
    },
    stdio: "inherit",
  },
);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
