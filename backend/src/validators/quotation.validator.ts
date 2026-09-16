import { z } from "zod";

export const createQuotationSchema = z.object({
  enquiryId: z
    .number()
    .int()
    .positive("Invalid enquiry ID"),

  validUntil: z
    .coerce
    .date(),

  discountPercent: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%"),

  gstPercent: z
    .number()
    .min(0, "GST cannot be negative")
    .max(100, "GST cannot exceed 100%"),

  items: z
    .array(
      z.object({
        productId: z
          .number()
          .int()
          .positive("Invalid product ID"),

        quantity: z
          .number()
          .int()
          .positive("Quantity must be greater than zero"),
      })
    )
    .min(1, "At least one product is required"),
});

export const updateQuotationStatusSchema = z.object({
  status: z.enum(["SENT", "ACCEPTED", "REJECTED"]),
});

export type CreateQuotationInput = z.infer<
  typeof createQuotationSchema
>;

export type UpdateQuotationStatusInput = z.infer<
  typeof updateQuotationStatusSchema
>;