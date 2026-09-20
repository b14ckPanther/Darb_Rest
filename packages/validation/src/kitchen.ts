import { z } from "zod";
import { KITCHEN_FILTERS } from "@darb-rest/types";
export const kitchenQuerySchema = z
  .object({
    location_id: z.string().uuid(),
    status: z.enum(KITCHEN_FILTERS),
    offset: z.number().int().min(0).max(100000),
  })
  .strict();
export const kitchenActionSchema = z
  .object({
    action_id: z.string().uuid(),
    location_id: z.string().uuid(),
    id: z.string().uuid(),
    revision: z.number().int().positive(),
    status: z.enum(["accepted", "preparing", "ready", "completed", "cancelled"]),
    reason: z.string().trim().max(500).default(""),
  })
  .strict()
  .refine((v) => (v.status === "cancelled" ? v.reason.length > 0 : v.reason.length === 0));
