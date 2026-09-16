import { z } from "zod";

export const salesOrderIdSchema = z.object({
  id: z.coerce.number().int().positive("Invalid sales order ID"),
});