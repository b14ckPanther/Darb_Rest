import { z } from "zod";
export const tableInputSchema = z
  .object({
    id: z.string().uuid(),
    location_id: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    action: z.enum(["create", "edit", "archive", "regenerate", "revoke"]),
    name: z.string().trim().min(1).max(64),
    area: z.string().trim().max(64),
    is_active: z.boolean(),
  })
  .strict();
