import { z } from "zod";

export const workOrderTypeValues = [
  "NEW_INSTALLATION", "REPAIR", "PREVENTIVE_MAINTENANCE",
  "EMERGENCY", "WARRANTY", "INSPECTION", "ESTIMATE_ONLY",
] as const;

export const workOrderStatusValues = [
  "NEW", "SCHEDULED", "DISPATCHED", "EN_ROUTE", "IN_PROGRESS",
  "ON_HOLD", "COMPLETE", "INVOICED", "PAID", "CANCELLED",
] as const;

export const priorityValues = ["EMERGENCY", "HIGH", "NORMAL", "LOW"] as const;

const id = z.string().min(1);

export const createWorkOrderSchema = z.object({
  customerId: id,
  serviceAddressId: id.optional().nullable(),
  assetId: id.optional().nullable(),
  type: z.enum(workOrderTypeValues).default("REPAIR"),
  priority: z.enum(priorityValues).default("NORMAL"),
  description: z.string().max(2000).optional().nullable(),
  internalNotes: z.string().max(2000).optional().nullable(),
  scheduledStart: z.coerce.date().optional().nullable(),
  estimatedDuration: z.number().int().min(0).optional().nullable(),
  costCodeId: id.optional().nullable(),
});

export const updateWorkOrderSchema = createWorkOrderSchema.partial();

export const updateWorkOrderStatusSchema = z.object({
  id,
  status: z.enum(workOrderStatusValues),
  note: z.string().max(500).optional(),
});

export const assignWorkOrderSchema = z.object({
  workOrderId: id,
  userIds: z.array(id).min(1).max(20),
  isLead: z.boolean().default(false),
});

export const listWorkOrdersSchema = z.object({
  status: z.enum(workOrderStatusValues).optional(),
  customerId: id.optional(),
  assignedUserId: id.optional(),
  type: z.enum(workOrderTypeValues).optional(),
  priority: z.enum(priorityValues).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
export type ListWorkOrdersInput = z.infer<typeof listWorkOrdersSchema>;
