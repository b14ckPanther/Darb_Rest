import { z } from "zod";
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((s) =>
      [...s].every((c) => {
        const code = c.charCodeAt(0);
        return (code >= 32 && code !== 127) || [9, 10, 13].includes(code);
      }),
    );
export const requestedPlanSchema = z.enum(["starter", "pro", "enterprise", "unsure"]);
const base = {
  full_name: text(120),
  business_name: text(160),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[+\d ()\-.]{7,40}$/)
    .refine((s) => s.replace(/\D/g, "").length >= 7),
  locale: z.enum(["en", "ar", "he"]),
};
export const acquisitionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...base,
      kind: z.literal("application"),
      city: text(120),
      business_type: z.enum(["restaurant", "cafe"]),
      branch_count: z.coerce.number().int().min(1).max(10000),
      requested_plan_code: requestedPlanSchema,
      message: z.string().trim().max(2000).default(""),
    })
    .strict(),
  z
    .object({
      ...base,
      phone: z.union([base.phone, z.literal("")]),
      kind: z.literal("inquiry"),
      message: text(2000),
    })
    .strict(),
]);
export const reviewApplicationSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(["approved", "rejected"]),
    internal_note: z.string().trim().max(2000),
    requested_plan_code: requestedPlanSchema,
  })
  .strict();
