// Browser QA always uses the operator-managed local database, never linked credentials.
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
const [app, port] = process.argv.slice(2);
if (!["web", "admin"].includes(app) || !["3000", "3001"].includes(port))
  throw Error("Invalid local QA app");
const config = JSON.parse(
  execFileSync("supabase", ["status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(config.API_URL))
  throw Error("Local database required");
const require = createRequire(new URL(`../apps/${app}/package.json`, import.meta.url));
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "-p", port], {
  cwd: new URL(`../apps/${app}`, import.meta.url),
  env: {
    ...process.env,
    NODE_ENV: "development",
    NEXT_PUBLIC_SUPABASE_URL: config.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: config.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: config.SERVICE_ROLE_KEY,
    DARB_TEST_DIST: ".next-v1-qa",
  },
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
