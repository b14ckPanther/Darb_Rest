import { z } from "zod";
import { operatingHourItemSchema } from "./business";

export const locationStatusSchema = z.enum(["active", "inactive", "temporarily_closed"]);

export const branchLocationCreateSchema = z.object({
  businessId: z.string().uuid(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens"),
  name: z.object({
    ar: z.string().min(1),
    he: z.string().min(1),
    en: z.string().min(1),
  }),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  addressLine1: z.string().min(2),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  stateRegion: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().min(2).max(2).default("IL"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().optional(),
  isPrimary: z.boolean().default(false),
  status: locationStatusSchema.default("active"),
  operatingHours: z.array(operatingHourItemSchema).optional(),
});

export const branchLocationUpdateSchema = branchLocationCreateSchema
  .partial()
  .omit({ businessId: true, slug: true });

export type BranchLocationCreateInput = z.infer<typeof branchLocationCreateSchema>;
export type BranchLocationUpdateInput = z.infer<typeof branchLocationUpdateSchema>;
