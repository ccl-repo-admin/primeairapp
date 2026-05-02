import { z } from "zod";

export const clockInSchema = z.object({
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  workOrderId: z.string().min(1).optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
  costCodeId: z.string().min(1).optional().nullable(),
  purchaseOrderId: z.string().min(1).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  clockInPhotoUrl: z.string().url().optional().nullable(),
  manualAddress: z.string().max(500).optional().nullable(),
});

export const clockOutSchema = z.object({
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const editTimeEntrySchema = z.object({
  timeEntryId: z.string().min(1),
  clockInAt: z.coerce.date().optional(),
  clockOutAt: z.coerce.date().optional(),
  breakMinutes: z.number().int().min(0).optional(),
  costCodeId: z.string().min(1).optional().nullable(),
  workOrderId: z.string().min(1).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  reason: z.string().min(1, "Reason is required when editing a timecard"),
});

export const locationPingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  speed: z.number().optional(),
  bearing: z.number().optional(),
  altitude: z.number().optional(),
  isDriving: z.boolean().default(false),
  timestamp: z.coerce.date(),
});

export const listEntriesSchema = z.object({
  userId: z.string().min(1).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z
    .enum(["ACTIVE", "PENDING", "APPROVED", "REJECTED"])
    .optional(),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});

export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type EditTimeEntryInput = z.infer<typeof editTimeEntrySchema>;
export type LocationPingInput = z.infer<typeof locationPingSchema>;
export type ListEntriesInput = z.infer<typeof listEntriesSchema>;
