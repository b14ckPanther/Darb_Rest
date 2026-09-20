import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  buildFixture,
  id,
  localEndpoint,
  upsert,
  validateEnvironment,
} from "./test-account-fixture.mjs";

test("production and remote endpoints are blocked before any client is created", () => {
  const env = {
    NODE_ENV: "development",
    TEST_ACCOUNT_CONFIRM: "local-only",
    TEST_ACCOUNT_EMAIL: "test@darb.co.il",
    TEST_ACCOUNT_PASSWORD: randomBytes(24).toString("hex"),
  };
  assert.doesNotThrow(() => validateEnvironment(env));
  for (const bad of [
    { NODE_ENV: "production" },
    { NODE_ENV: undefined },
    { TEST_ACCOUNT_CONFIRM: undefined },
    { VERCEL_ENV: "production" },
    { TEST_ACCOUNT_PASSWORD: "" },
    { TEST_ACCOUNT_EMAIL: "invalid" },
  ])
    assert.throws(() => validateEnvironment({ ...env, ...bad }));
  for (const endpoint of [
    "https://project.supabase.co",
    "http://localhost.evil.test:54321",
    "http://user:pass@localhost:54321",
    "http://localhost:54321/remote",
    "https://localhost:54321",
    "http://localhost:54321?redirect=evil",
  ])
    assert.throws(() => localEndpoint(endpoint));
  assert.equal(localEndpoint("http://127.0.0.1:54321"), "http://127.0.0.1:54321");
});
test("SQL quoting protects values; deterministic identities and transactional data only", () => {
  assert.equal(id("business"), id("business"));
  assert.notEqual(id("business"), id("other"));
  assert.match(upsert("profiles", { id: id("user"), full_name: "Darb's test" }), /Darb''s test/);
  assert.throws(() => upsert("x; drop table users", { id: "x" }));
  const tokens = Array.from({ length: 4 }, (_, n) => String(n).repeat(64));
  const media = Array.from(
    { length: 5 },
    (_, n) => `businesses/${id("business")}/menu-items/${id(`item:${n}`)}/${id(`image:${n}`)}.webp`,
  );
  const sql = buildFixture(id("user"), media, tokens, new Date("2026-09-19T12:00:00Z"));
  assert.equal(sql, buildFixture(id("user"), media, tokens, new Date("2026-09-19T12:00:00Z")));
  assert.ok(sql.startsWith("BEGIN;"));
  assert.ok(sql.endsWith("COMMIT;"));
  assert.match(sql, /SET CONSTRAINTS ALL DEFERRED/);
  assert.doesNotMatch(
    sql,
    /CREATE TABLE|ALTER TABLE|DISABLE TRIGGER|INSERT INTO public\."platform_admins"/,
  );
  assert.equal((sql.match(/INSERT INTO public\."businesses"/g) ?? []).length, 6);
  assert.equal((sql.match(/INSERT INTO public\."orders"/g) ?? []).length, 7);
  for (const table of [
    "orders",
    "order_items",
    "order_item_tasks",
    "printer_events",
    "payments",
    "restaurant_operation_history",
  ])
    for (const line of sql.split("\n").filter((l) => l.startsWith(`INSERT INTO public."${table}"`)))
      assert.match(line, /DO NOTHING/);
  assert.equal((sql.match(/INSERT INTO public\."table_qr_tokens"/g) ?? []).length, 3);
  assert.match(sql, /DELETE FROM public\.table_qr_tokens WHERE table_id=/);
  assert.match(sql, /"published"/);
  assert.match(sql, /editorial/);
  assert.match(sql, /"base_unit_cents".*1900,300,2200/);
});

// Import only pure helpers: never execute the Auth/Storage/database entry point.
test("repository working directory is a filesystem string accepted by Node", async () => {
  const { repositoryPath, FixtureConfigError } = await import("./test-account-fixture.mjs");
  const { statSync } = await import("node:fs");
  const { isAbsolute } = await import("node:path");
  assert.equal(typeof repositoryPath, "string");
  assert.ok(isAbsolute(repositoryPath));
  assert.ok(statSync(repositoryPath).isDirectory());
  assert.throws(() => validateEnvironment({}), FixtureConfigError);
  assert.throws(() => localEndpoint("invalid"), FixtureConfigError);
});
