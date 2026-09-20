import { z } from "zod";

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a valid hex color code");

export const tenantThemeSchema = z.object({
  primaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
  themePreset: z.enum(["modern", "classic", "minimal", "vibrant"]).default("modern"),
});

export type TenantThemeInput = z.infer<typeof tenantThemeSchema>;
