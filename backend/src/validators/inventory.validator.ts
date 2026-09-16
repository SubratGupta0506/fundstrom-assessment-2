import { z } from "zod";

export const updateInventorySchema = z.object({
  physicalQty: z
    .number()
    .int()
    .min(0, "Physical quantity cannot be negative"),

  reservedQty: z
    .number()
    .int()
    .min(0, "Reserved quantity cannot be negative"),
});

export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;