import { z } from "zod";

export const tenantRoleSchema = z.enum([
  "owner",
  "admin",
  "manager",
  "editor",
  "staff",
  "read_only",
]);

export const membershipStatusSchema = z.enum(["active", "invited", "suspended"]);

export const userProfileUpdateSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().nullable().optional(),
  preferredLocale: z.enum(["ar", "he", "en"]).optional(),
});

export const memberInviteSchema = z.object({
  email: z.string().email(),
  role: tenantRoleSchema,
});

export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;
export type MemberInviteInput = z.infer<typeof memberInviteSchema>;
