"use server";
import { acquisitionSchema } from "@darb-rest/validation";
import { getAdminClient } from "@darb-rest/supabase/admin";
import { deliverCustomerMail } from "@darb-rest/supabase/customer-mail";
import { buildCustomerMessage } from "@darb-rest/supabase/customer-messages";
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
    if (!error && parsed.data.kind === "application") {
      // Persistence succeeded. Delivery is best-effort and never changes the public outcome.
      try {
        const db = getAdminClient();
        const { data: application } = await db
          .from("restaurant_applications")
          .select("id")
          .eq("email", parsed.data.email.toLowerCase())
          .eq("business_name", parsed.data.business_name)
          .eq("kind", "application")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (application) {
          const { data: mail } = await db
            .from("customer_mail_outbox")
            .select("id")
            .eq("application_id", application.id)
            .eq("kind", "received")
            .eq("state", "queued")
            .maybeSingle();
          if (mail) await deliverCustomerMail(mail.id, buildCustomerMessage);
        }
      } catch {
        /* The outbox remains available to the platform operator. */
      }
    }
    // Never disclose whether the applicant already has a pending request.
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
