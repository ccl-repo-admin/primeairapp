import { z } from "zod";

export const timeOffTypeValues = ["VACATION", "SICK", "PERSONAL", "BEREAVEMENT", "UNPAID", "OTHER"] as const;

export const createTimeOffPolicySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(timeOffTypeValues),
  accrualEnabled: z.boolean().default(false),
  accrualRateHoursPerYear: z.number().min(0).max(1000).optional().nullable(),
  maxBalanceHours: z.number().min(0).max(9999).optional().nullable(),
  maxRequestDays: z.number().int().min(1).max(365).default(14),
});

export const requestTimeOffSchema = z.object({
  policyId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  hoursPerDay: z.number().min(0).max(24).default(8),
  reason: z.string().max(500).optional().nullable(),
}).refine((d) => d.endDate >= d.startDate, { message: "End date must be after start date" });

export const reviewTimeOffSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional().nullable(),
});

export type RequestTimeOffInput = z.infer<typeof requestTimeOffSchema>;
export type ReviewTimeOffInput = z.infer<typeof reviewTimeOffSchema>;
