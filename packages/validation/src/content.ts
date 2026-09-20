import { z } from "zod";
import { CONTENT_TABLES, DIETARY_TAGS, ALLERGENS } from "@darb-rest/types";
const uuid = z.string().uuid();
export const contentNameSchema = z
  .object({
    ar: z.string().trim().max(160).optional(),
    he: z.string().trim().max(160).optional(),
    en: z.string().trim().max(160).optional(),
  })
  .strict()
  .refine((v) => Object.values(v).some((s) => s?.trim()));
const description = z
  .object({
    ar: z.string().max(2000).optional(),
    he: z.string().max(2000).optional(),
    en: z.string().max(2000).optional(),
  })
  .strict();
export const contentPriceSchema = z
  .number()
  .finite()
  .min(0)
  .max(9999999999.99)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001);
const order = z.number().int().min(0).max(1000000);
const base = { id: uuid, sort_order: order.optional() };
const name = { name_i18n: contentNameSchema, description_i18n: description.optional() };
export const menuSchema = z
  .object({
    ...base,
    ...name,
    status: z.enum(["draft", "active", "archived"]).optional(),
    is_default: z.boolean().optional(),
    archived_at: z.string().datetime().nullable().optional(),
  })
  .strict();
export const sectionSchema = z
  .object({ ...base, ...name, menu_id: uuid, is_visible: z.boolean().optional() })
  .strict();
export const itemSchema = z
  .object({
    ...base,
    ...name,
    section_id: uuid,
    base_price: contentPriceSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    sku: z.string().max(80).nullable().optional(),
    image_path: z.string().max(300).nullable().optional(),
    is_visible: z.boolean().optional(),
    is_available: z.boolean().optional(),
    archived_at: z.string().datetime().nullable().optional(),
  })
  .strict();
export const variantSchema = z
  .object({
    ...base,
    item_id: uuid,
    name_i18n: contentNameSchema,
    price: contentPriceSchema,
    is_available: z.boolean().optional(),
  })
  .strict();
export const modifierGroupSchema = z
  .object({
    ...base,
    name_i18n: contentNameSchema,
    min_select: z.number().int().min(0).max(100),
    max_select: z.number().int().min(0).max(100),
    is_required: z.boolean(),
  })
  .strict()
  .refine((g) => g.max_select >= g.min_select && g.is_required === g.min_select > 0);
export const modifierSchema = z
  .object({
    ...base,
    modifier_group_id: uuid,
    name_i18n: contentNameSchema,
    price_delta: contentPriceSchema,
    is_available: z.boolean().optional(),
  })
  .strict();
export const branchOverrideSchema = z
  .object({
    ...base,
    item_id: uuid,
    location_id: uuid,
    is_visible_override: z.boolean().nullable(),
    is_available_override: z.boolean().nullable(),
    price_override: contentPriceSchema.nullable(),
  })
  .strict();
export const contentSchemas = {
  menus: menuSchema,
  menu_sections: sectionSchema,
  menu_items: itemSchema,
  item_variants: variantSchema,
  modifier_groups: modifierGroupSchema,
  modifiers: modifierSchema,
  menu_locations: z
    .object({ ...base, menu_id: uuid, location_id: uuid, is_enabled: z.boolean() })
    .strict(),
  item_modifier_groups: z.object({ ...base, item_id: uuid, modifier_group_id: uuid }).strict(),
  item_dietary_tags: z.object({ ...base, item_id: uuid, code: z.enum(DIETARY_TAGS) }).strict(),
  item_allergens: z.object({ ...base, item_id: uuid, code: z.enum(ALLERGENS) }).strict(),
  menu_item_location_overrides: branchOverrideSchema,
};
export const contentOperationSchema = z
  .object({
    table: z.enum(CONTENT_TABLES),
    row: z.record(z.unknown()).optional(),
    id: uuid.optional(),
    delete: z.boolean().optional(),
  })
  .strict()
  .superRefine((op, ctx) => {
    if (op.delete) {
      if (!op.id || ["menus", "menu_sections", "menu_items"].includes(op.table))
        ctx.addIssue({ code: "custom", message: "Archive content instead" });
    } else if (!contentSchemas[op.table].safeParse(op.row).success)
      ctx.addIssue({ code: "custom", message: "Invalid content" });
  });
export const contentBatchSchema = z.array(contentOperationSchema).min(1).max(200);
export const imageMetadataSchema = z
  .object({
    type: z.enum(["image/jpeg", "image/png", "image/webp"]),
    size: z
      .number()
      .positive()
      .max(5 * 1024 * 1024),
    width: z.number().int().min(64).max(10000),
    height: z.number().int().min(64).max(10000),
  })
  .refine((x) => x.width * x.height <= 40000000);
export function validModifierCapacity(
  min: number,
  max: number,
  options: { is_available: boolean }[],
) {
  return (
    min >= 0 &&
    max >= min &&
    max <= options.length &&
    min <= options.filter((o) => o.is_available).length
  );
}
