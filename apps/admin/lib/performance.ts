import "server-only";
import { getServerClient } from "@darb-rest/supabase/server";

// Opt-in diagnostics: no URLs, query strings, user IDs, headers or response bodies.
export function measuredClient(scope: string) {
  if (process.env.ADMIN_PERF_TRACE !== "1") return getServerClient();
  const client = crypto.randomUUID();
  const start = performance.now();
  return getServerClient({
    fetch: async (input, init) => {
      const path = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      ).pathname;
      const known = [
        "user",
        "profiles",
        "memberships",
        "businesses",
        "plans",
        "locations",
        "plan_entitlements",
        "business_feature_overrides",
        "is_platform_admin",
      ];
      const part = path.split("/").at(-1) ?? "";
      const operation = known.includes(part) ? part : "other";
      const at = performance.now();
      try {
        return await fetch(input, init);
      } finally {
        console.info(
          JSON.stringify({
            event: "admin_query",
            scope,
            client,
            operation,
            startMs: Math.round(at - start),
            durationMs: Math.round(performance.now() - at),
          }),
        );
      }
    },
  });
}

export async function measureAdminTask<T>(operation: string, run: () => Promise<T>): Promise<T> {
  if (process.env.ADMIN_PERF_TRACE !== "1") return run();
  const start = performance.now();
  try {
    return await run();
  } finally {
    console.info(
      JSON.stringify({
        event: "admin_task",
        operation,
        durationMs: Math.round(performance.now() - start),
      }),
    );
  }
}
