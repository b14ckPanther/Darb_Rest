import { z } from "zod";
import { TABLE_STATES } from "@darb-rest/types";
const base = z.object({ action_id: z.string().uuid(), location_id: z.string().uuid() });
const id = z.string().uuid();
const revision = z.number().int().positive();
export const restaurantActionSchema = z.discriminatedUnion("action", [
  base
    .extend({
      action: z.literal("station"),
      payload: z
        .object({
          id,
          revision: z.number().int().nonnegative(),
          name: z.string().trim().min(1).max(64),
          active: z.boolean(),
        })
        .strict(),
    })
    .strict(),
  base
    .extend({
      action: z.literal("route"),
      payload: z
        .object({ id, station_id: id, kind: z.enum(["item", "section"]), enabled: z.boolean() })
        .strict(),
    })
    .strict(),
  base
    .extend({
      action: z.literal("roster"),
      payload: z.object({ user_id: id, enabled: z.boolean() }).strict(),
    })
    .strict(),
  base
    .extend({
      action: z.literal("rush"),
      payload: z.object({ id, revision, enabled: z.boolean() }).strict(),
    })
    .strict(),
  base
    .extend({
      action: z.literal("assign_order"),
      payload: z.object({ id, revision, user_id: id.nullable() }).strict(),
    })
    .strict(),
  base
    .extend({
      action: z.literal("assign_table"),
      payload: z.object({ id, revision, user_id: id.nullable() }).strict(),
    })
    .strict(),
  base
    .extend({
      action: z.literal("table_state"),
      payload: z.object({ id, revision, state: z.enum(TABLE_STATES) }).strict(),
    })
    .strict(),
  base
    .extend({
      action: z.literal("task"),
      payload: z.object({ id, revision, state: z.enum(["preparing", "ready"]) }).strict(),
    })
    .strict(),
  base
    .extend({
      action: z.literal("preferences"),
      payload: z.object({ new_orders: z.boolean(), ready_orders: z.boolean() }).strict(),
    })
    .strict(),
]);
export const restaurantQuerySchema = z
  .object({
    location_id: id,
    status: z.enum([
      "active",
      "submitted",
      "accepted",
      "preparing",
      "ready",
      "completed",
      "cancelled",
    ]),
    offset: z.number().int().min(0).max(100000),
    station_id: id.nullable(),
    unassigned: z.boolean(),
    mine: z.boolean(),
  })
  .strict()
  .refine((v) => !v.unassigned || v.station_id === null);
