"use server";
import { acquisitionSchema } from "@darb-rest/validation";
import { getAdminClient } from "@darb-rest/supabase/admin";
import { publicMutationBudget } from "./launch";

export async function submitAcquisition(raw: unknown): Promise<{ ok: boolean; fields?: string[] }> {
  const parsed = acquisitionSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, fields: parsed.error.issues.map((issue) => String(issue.path[0])) };
  try {
    await publicMutationBudget();
    const { error } = await getAdminClient().rpc("submit_restaurant_application", {
      p_input: parsed.data,
    });
    // Never disclose whether the applicant already has a pending request.
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
