"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Creates or reuses a typed browser Supabase client
 */
export function getBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error(
      "[Darb REST Supabase] getBrowserClient must only be called in browser runtime.",
    );
  }

  if (!clientInstance) {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

    clientInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  return clientInstance;
}
