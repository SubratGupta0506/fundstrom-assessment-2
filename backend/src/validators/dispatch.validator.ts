import { z } from "zod";

export const createDispatchSchema = z.object({
  vehicleNumber: z
    .string()
    .trim()
    .min(1, "Vehicle number is required")
    .max(30, "Vehicle number is too long"),

  driverName: z
    .string()
    .trim()
    .min(1, "Driver name is required")
    .max(100, "Driver name is too long"),

  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "At least one dispatch item is required"),
});

export type CreateDispatchInput = z.infer<typeof createDispatchSchema>;