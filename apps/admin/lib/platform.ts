import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { adminAuth, platformRole } from "./auth";
import { measureAdminTask } from "./performance";
import { isValidLocale } from "@darb-rest/i18n";

// A fresh authenticated database check protects every page and every mutation.
export const requirePlatform = cache((locale: string) =>
  measureAdminTask("platform.guard", async () => {
    if (!isValidLocale(locale)) notFound();
    const auth = await adminAuth();
    const {
      db,
      data: { user },
      error,
    } = auth;
    if (error || !user) redirect(`/${locale}/auth/signin`);
    const admin = await platformRole(user.id);
    if (admin.error || admin.data !== true) notFound();
    return { db, user };
  }),
);
export function platformPage(value?: string) {
  const page = Number(value ?? 1);
  return Number.isSafeInteger(page) && page >= 1 && page <= 100000 ? page : 1;
}
export function requireData<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw Error("platform_query_failed");
  return result.data;
}
