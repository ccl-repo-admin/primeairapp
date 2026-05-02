import { z } from "zod";

export const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50).optional().nullable(),
  companyName: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().regex(/^\d{10,15}$/, "Must be 10–15 digits").optional().nullable(),
  altPhone: z.string().regex(/^\d{10,15}$/).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  // Primary address (maps to ServiceAddress line1/line2 in DB)
  line1: z.string().max(200).optional().nullable(),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersSchema = z.object({
  search: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export const createServiceAddressSchema = z.object({
  customerId: z.string().min(1),
  label: z.string().max(100).optional().nullable(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(50),
  zip: z.string().min(1).max(20),
  notes: z.string().max(500).optional().nullable(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateServiceAddressInput = z.infer<typeof createServiceAddressSchema>;
