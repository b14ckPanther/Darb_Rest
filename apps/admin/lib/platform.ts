import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { getServerClient } from "@darb-rest/supabase/server";
import { isValidLocale } from "@darb-rest/i18n";

// A fresh authenticated database check protects every page and every mutation.
export const requirePlatform = cache(async (locale: string) => {
  if (!isValidLocale(locale)) notFound();
  const db = await getServerClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) redirect(`/${locale}/auth/signin`);
  const admin = await db.rpc("is_platform_admin", { target_user_id: user.id });
  if (admin.error || admin.data !== true) notFound();
  return { db, user };
});
export function platformPage(value?: string) {
  const page = Number(value ?? 1);
  return Number.isSafeInteger(page) && page >= 1 && page <= 100000 ? page : 1;
}
export function requireData<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw Error("platform_query_failed");
  return result.data;
}
