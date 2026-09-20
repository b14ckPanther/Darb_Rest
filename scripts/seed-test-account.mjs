// Explicit manual entry point. Never imported by tests or application startup.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { randomBytes } from "node:crypto";
import {
  buildFixture,
  FixtureConfigError,
  repositoryPath,
  dishes,
  id,
  localEndpoint,
  validateEnvironment,
} from "./test-account-fixture.mjs";

let phase = "environment checks",
  locked = false;
const lock = new URL("../.tmp/test-account-seed.lock", import.meta.url);
try {
  validateEnvironment(process.env);
  phase = "repository directory";
  process.chdir(repositoryPath);
  phase = "local Docker context (Docker Desktop must be running)";
  // Explicitly select a local Docker socket; never use an SSH/TCP Docker context.
  const context = JSON.parse(
    execFileSync("docker", ["context", "inspect"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  )[0];
  const socket = process.env.DOCKER_HOST || context.Endpoints?.docker?.Host;
  if (!socket?.startsWith("unix://")) throw Error("Local Docker socket required");
  const env = { ...process.env, DOCKER_HOST: socket, DOCKER_CONTEXT: "" };
  phase = "local Supabase status (local stack must already be running)";
  const status = JSON.parse(
    execFileSync("supabase", ["status", "-o", "json"], {
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  const url = localEndpoint(status.API_URL);
  if (!status.SERVICE_ROLE_KEY) throw Error("Local Supabase service key unavailable");
  phase = "local project configuration";
  const project = readFileSync("supabase/config.toml", "utf8").match(
    /^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m,
  )?.[1];
  if (!project) throw Error("Invalid local project ID");
  const sql = (input) =>
    execFileSync(
      "docker",
      [
        "--host",
        socket,
        "exec",
        "-i",
        `supabase_db_${project}`,
        "psql",
        "-X",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-Atq",
      ],
      { input, env, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
  mkdirSync(".tmp", { recursive: true });
  phase = "local seeder lock (see documentation if a previous run was interrupted)";
  mkdirSync(lock);
  locked = true;
  phase = "migration 1–10 preflight (apply missing migrations manually)";
  sql(
    "SELECT draft,published FROM public.restaurant_appearance LIMIT 0; SELECT state FROM public.order_item_tasks LIMIT 0; SELECT operational_state FROM public.restaurant_tables LIMIT 0;",
  );
  const require = createRequire(new URL("../packages/supabase/package.json", import.meta.url));
  const { createClient } = require("@supabase/supabase-js");
  const client = createClient(url, status.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, options) => {
        if (new URL(typeof input === "string" ? input : (input.url ?? input)).origin !== url)
          throw Error("Non-local request blocked");
        return fetch(input, { ...options, redirect: "error" });
      },
    },
  });
  phase = "Auth account lookup";
  const email = process.env.TEST_ACCOUNT_EMAIL.trim().toLowerCase();
  let user;
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user || data.users.length < 1000) break;
  }
  if (user) {
    const { data, error } = await client
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id);
    if (error || data.length) throw Error("Existing platform admin is not eligible");
  }
  phase = "Auth create/update";
  const auth = {
    email,
    password: process.env.TEST_ACCOUNT_PASSWORD,
    email_confirm: true,
    user_metadata: { ...(user?.user_metadata ?? {}), full_name: "Darb Test Operator" },
  };
  const result = user
    ? await client.auth.admin.updateUserById(user.id, auth)
    : await client.auth.admin.createUser(auth);
  if (result.error || !result.data.user) throw Error("Auth update failed");
  user = result.data.user;
  // Auth owns the UUID. Reuse the matched account forever rather than inserting auth tables manually.
  phase = "local fixture media upload";
  const adminRequire = createRequire(new URL("../apps/admin/package.json", import.meta.url));
  const sharp = adminRequire("sharp");
  const media = [];
  for (let n = 0; n < dishes.length; n++) {
    const path = `businesses/${id("business")}/menu-items/${id(`item:${n}`)}/${id(`image:${n}`)}.webp`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${["#325d41", "#76523a", "#6d3c42", "#826b38", "#445366"][n]}"/><circle cx="400" cy="280" r="160" fill="#eee6d8"/><text x="400" y="500" text-anchor="middle" font-family="sans-serif" font-size="32" fill="white">TEST · ${dishes[n].en}</text></svg>`;
    const bytes = await sharp(Buffer.from(svg)).webp().toBuffer();
    const { error } = await client.storage
      .from("menu-media")
      .upload(path, bytes, { contentType: "image/webp", upsert: true });
    if (error) throw error;
    media.push(path);
  }
  phase = "atomic development fixture transaction";
  sql(
    buildFixture(
      user.id,
      media,
      Array.from({ length: 4 }, () => randomBytes(32).toString("hex")),
    ),
  );
  phase = "QR manifest";
  const [active, revoked] = await Promise.all([
    client.from("table_qr_tokens").select("table_id,token").eq("business_id", id("business")),
    client
      .from("restaurant_operation_history")
      .select("payload")
      .eq("id", id("revocation"))
      .single(),
  ]);
  if (active.error || revoked.error) throw Error("QR manifest unavailable");
  writeFileSync(
    ".tmp/test-account-qr.json",
    JSON.stringify(
      {
        active: active.data.map((r) => ({ tableId: r.table_id, route: `/en/q/${r.token}` })),
        revokedRoute: `/en/q/${revoked.data.payload.revoked_token}`,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    "Local test account ready. Business: darb-test-restaurant; branches: central, garden.",
  );
  console.log(
    "Secondary roles: admin, manager, editor, staff, read_only. QR paths: .tmp/test-account-qr.json",
  );
} catch (error) {
  // Only our fixed configuration messages are safe to display.
  if (error instanceof FixtureConfigError) console.error(error.message);
  // SDK/CLI errors may contain credentials or SQL payloads. Never print raw errors.
  console.error(
    `Test-account setup stopped during ${phase}. Check docs/TEST-ACCOUNT.md; no credentials were logged.`,
  );
  process.exitCode = 1;
} finally {
  if (locked) rmSync(lock, { recursive: true });
}
