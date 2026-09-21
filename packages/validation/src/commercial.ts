import { z } from "zod";
import { V1_FEATURE_FLAGS } from "@darb-rest/types";
const localized = z
  .object({
    en: z.string().trim().max(1000),
    ar: z.string().trim().max(1000),
    he: z.string().trim().max(1000),
  })
  .strict();
export const commercialEditSchema = z
  .object({
    id: z.string().uuid(),
    monthly_price_ils: z.coerce.number().finite().min(0).max(9999999999.99),
    yearly_price_ils: z.coerce.number().finite().min(0).max(9999999999.99),
    price_is_starting: z.boolean(),
    is_active: z.boolean(),
    display_order: z.coerce.number().int().min(0).max(10000),
    description: localized,
    billing_note: localized,
    public_features: z
      .object({
        en: z.array(z.string().trim().min(1).max(200)).max(10),
        ar: z.array(z.string().trim().min(1).max(200)).max(10),
        he: z.array(z.string().trim().min(1).max(200)).max(10),
      })
      .strict(),
  })
  .strict();
export const entitlementEditSchema = z
  .object({
    id: z.string().uuid(),
    features: z
      .array(
        z
          .object({
            feature_key: z.enum(V1_FEATURE_FLAGS),
            enabled: z.boolean(),
            limit_value: z.number().int().min(1).max(10000).nullable(),
          })
          .strict(),
      )
      .length(V1_FEATURE_FLAGS.length),
  })
  .strict()
  .refine((x) => new Set(x.features.map((f) => f.feature_key)).size === V1_FEATURE_FLAGS.length);
