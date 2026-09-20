"use server";
import { canManageBranding, supportedAppearance, brandingPath } from "@darb-rest/types";
import { appearanceSaveSchema } from "@darb-rest/validation";
import { contentContext } from "../content/service";
export async function saveAppearance(raw: unknown) {
  const parsed = appearanceSaveSchema.safeParse(raw);
  if (!parsed.success || !supportedAppearance(parsed.data.settings))
    return { ok: false, error: "invalid" } as const;
  try {
    const ctx = await contentContext();
    if (!ctx || !canManageBranding(ctx.role) || ctx.business.id !== parsed.data.expectedBusinessId)
      return { ok: false, error: "unavailable" } as const;
    for (const key of ["logo", "cover"] as const) {
      const ref = parsed.data.settings[key];
      if (ref.startsWith("https://media.darb.invalid/")) {
        const path = brandingPath(ref);
        if (!path || !path.startsWith(`${ctx.business.id}/`))
          return { ok: false, error: "invalid" } as const;
        const found = await ctx.db.storage.from("restaurant-branding").download(path);
        if (found.error || !found.data) return { ok: false, error: "invalid" } as const;
      }
    }
    const { data, error } = await ctx.db.rpc("save_restaurant_appearance", {
      p_business_id: ctx.business.id,
      p_revision: parsed.data.revision,
      p_settings: parsed.data.settings,
      p_publish: parsed.data.publish,
    });
    if (error) return { ok: false, error: error.code === "40001" ? "conflict" : "error" } as const;
    return { ok: true, revision: data } as const;
  } catch {
    return { ok: false, error: "error" } as const;
  }
}
