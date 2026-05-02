import { z } from "zod";

export const jobTypeValues = [
  "SERVICE_TECH",
  "INSTALLER",
  "OFFICE_STAFF",
] as const;

export const payTypeValues = ["HOURLY", "SALARY"] as const;

export const createUserSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().optional().nullable(),
  phone: z
    .string()
    .regex(/^\d{10,15}$/, "Phone must be 10-15 digits, no spaces")
    .optional()
    .nullable(),
  roleId: z.string().min(1).optional(),
  jobType: z.enum(jobTypeValues).default("SERVICE_TECH"),
  payType: z.enum(payTypeValues).default("HOURLY"),
  hourlyRate: z.number().min(0).max(9999).optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
  maxDailyMinutes: z.number().int().min(0).max(1440).optional().nullable(),
  maxWeeklyMinutes: z.number().int().min(0).max(10080).optional().nullable(),
});

export const updateUserSchema = createUserSchema.partial();

export const bulkImportRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  roleName: z.string().optional(),
  jobType: z.enum(jobTypeValues).default("SERVICE_TECH"),
  hourlyRate: z.coerce.number().optional(),
  title: z.string().optional(),
});

export const bulkImportSchema = z.array(bulkImportRowSchema).min(1).max(500);

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type BulkImportRow = z.infer<typeof bulkImportRowSchema>;
