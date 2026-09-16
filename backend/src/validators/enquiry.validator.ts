import { z } from "zod";

export const createEnquirySchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company name is required"),

  contactPerson: z
    .string()
    .trim()
    .min(2, "Contact person is required"),

  mobile: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Mobile number must contain exactly 10 digits"),

  email: z
    .string()
    .trim()
    .email("Invalid email address"),

  city: z
    .string()
    .trim()
    .min(2, "City is required"),

  enquiryDate: z
    .coerce
    .date()
    .optional(),

  requiredDate: z
    .coerce
    .date(),

  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional(),

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

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;