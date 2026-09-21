// Real local Supabase fixtures and isolated Next server; never contacts the linked project.
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(new URL("../packages/supabase/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");
const status = JSON.parse(
  execFileSync("supabase", ["status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
const url = status.API_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) throw Error("Local Supabase required");
const client = createClient(url, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const password = "Local-phase4-test-only-2026!";
const { data: users, error } = await client.auth.admin.listUsers();
if (error) throw error;
for (const [name, role] of [
  ["owner", "owner"],
  ["editor", "editor"],
  ["reader", "read_only"],
  ["staff", "staff"],
  ["manager", "manager"],
  ["admin", "admin"],
]) {
  const email = `${name}@phase4.example`;
  let user = users.users.find((u) => u.email === email);
  if (!user) {
    const result = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Phase 4 ${name}` },
    });
    if (result.error) throw result.error;
    user = result.data.user;
  }
  const { error: membership } = await client.from("memberships").upsert(
    {
      user_id: user.id,
      business_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      role,
      status: "active",
    },
    { onConflict: "user_id,business_id" },
  );
  if (membership) throw membership;
}
const commercial = await client.from("plans").select("id").eq("code", "business").single();
if (commercial.error) throw commercial.error;
const assigned = await client
  .from("businesses")
  .update({ plan_id: commercial.data.id })
  .eq("id", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
if (assigned.error) throw assigned.error;
if (process.argv.includes("--fixtures-only")) process.exit(0);
const adminRequire = createRequire(new URL("../apps/admin/package.json", import.meta.url));
const child = spawn(
  process.execPath,
  [adminRequire.resolve("next/dist/bin/next"), "dev", "-p", "3101"],
  {
    cwd: path.resolve("apps/admin"),
    env: {
      ...process.env,
      NODE_ENV: "development",
      NEXT_PUBLIC_WEB_URL: "http://localhost:3100",
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
      NEXT_PUBLIC_ADMIN_URL: "http://localhost:3101",
      TRANSACTIONAL_EMAIL_PROVIDER: "",
      RESEND_API_KEY: "",
      TRANSACTIONAL_EMAIL_ENDPOINT: "",
      TRANSACTIONAL_EMAIL_TOKEN: "",
      DARB_TEST_DIST: ".next-phase4",
    },
    stdio: "inherit",
  },
);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
