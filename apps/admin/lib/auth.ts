import "server-only";
import { cache } from "react";
import { measuredClient } from "./performance";

// React cache is scoped to one server render, never shared between accounts/requests.
const adminClient = cache(() => measuredClient("admin"));
export const adminAuth = cache(async () => {
  const db = await adminClient();
  return { db, ...(await db.auth.getUser()) };
});
// Callers pass the identity returned by adminAuth, never a form/cookie user ID.
// Keeping this separate avoids a second Auth request in server-action contexts.
export const platformRole = cache(
  async (verifiedUserId: string): Promise<{ data: boolean | null; error: unknown }> => {
    const db = await adminClient();
    return db.rpc("is_platform_admin", { target_user_id: verifiedUserId });
  },
);
