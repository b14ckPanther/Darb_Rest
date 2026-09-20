import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Creates a privileged service-role admin Supabase client.
 * STRICTLY SERVER-ONLY. Never import or call this on the client.
 */
export function getAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "[Darb REST Security Alert] Attempted to instantiate Supabase Admin Client in a client-side environment! Service role credentials must NEVER be exposed to the browser.",
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey && process.env.NODE_ENV === "production") {
    throw new Error(
      "[Darb REST Supabase] Missing SUPABASE_SERVICE_ROLE_KEY environment variable in production.",
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey || "placeholder-service-role-key", {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
