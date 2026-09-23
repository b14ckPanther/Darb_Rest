import { z } from "zod";
import { safePublicUrl, LAYOUT_OPTIONS } from "@darb-rest/types";
const media = z
  .string()
  .max(2048)
  .refine((s) => s === "" || !!safePublicUrl(s));
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const semanticThemeSchema = z
  .object({
    primary: hexColor.optional(),
    accent: hexColor.optional(),
    pageBackground: hexColor.optional(),
    cardBackground: hexColor.optional(),
    alternateSurface: hexColor.optional(),
    text: hexColor.optional(),
    textMuted: hexColor.optional(),
    border: hexColor.optional(),
    navBackground: hexColor.optional(),
    activeCategoryBackground: hexColor.optional(),
    activeCategoryText: hexColor.optional(),
    buttonBackground: hexColor.optional(),
    buttonText: hexColor.optional(),
    priceBackground: hexColor.optional(),
    priceText: hexColor.optional(),
    heroOverlay: hexColor.optional(),
    openStatus: hexColor.optional(),
    closedStatus: hexColor.optional(),
    modalBackground: hexColor.optional(),
    modalText: hexColor.optional(),
    footerBackground: hexColor.optional(),
    footerText: hexColor.optional(),
  })
  .strict();

export const appearanceSchema = z
  .object({
    layout: z
      .object({
        hero: z.enum(LAYOUT_OPTIONS.hero),
        focal: z.enum(LAYOUT_OPTIONS.focal),
        navigation: z.enum(LAYOUT_OPTIONS.navigation),
        cards: z.enum(LAYOUT_OPTIONS.cards),
        information: z.enum(LAYOUT_OPTIONS.information),
        cta: z.enum(LAYOUT_OPTIONS.cta),
        footer: z.enum(LAYOUT_OPTIONS.footer),
        surface: z.enum(LAYOUT_OPTIONS.surface),
      })
      .strict()
      .optional(),
    template: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),
    version: z.number().int().min(1).max(10000),
    primary: z.string().regex(/^#[0-9a-f]{6}$/i),
    accent: z.string().regex(/^#[0-9a-f]{6}$/i),
    logo: media,
    cover: media,
    coverVideo: media,
    density: z.enum(["airy", "balanced", "compact"]),
    images: z.boolean(),
    theme: semanticThemeSchema.optional(),
  })
  .strict();
export const appearanceSaveSchema = z
  .object({
    expectedBusinessId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    settings: appearanceSchema,
    publish: z.boolean(),
  })
  .strict();
