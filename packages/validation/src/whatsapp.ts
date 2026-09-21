import { z } from "zod";
const details = {
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[^\r\n]+$/),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,30}$/)
    .refine((v) => v.replace(/\D/g, "").length >= 7),
  notes: z.string().trim().max(1000),
};
export const whatsappRequestSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...details,
      kind: z.literal("order"),
      lines: z
        .array(
          z
            .object({
              item_id: z.string().uuid(),
              variant_id: z.string().uuid().nullable(),
              modifier_ids: z.array(z.string().uuid()).max(50),
              quantity: z.number().int().min(1).max(99),
            })
            .strict(),
        )
        .min(1)
        .max(50),
    })
    .strict(),
  z
    .object({
      ...details,
      kind: z.literal("reservation"),
      guests: z.number().int().min(1).max(100),
      date: z.string().date(),
      time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    })
    .strict(),
]);
