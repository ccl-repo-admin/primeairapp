import { z } from "zod";

const permissionFields = {
  hubAccess: z.boolean().optional(),
  timeclockAccess: z.boolean().optional(),
  canClockIn: z.boolean().optional(),
  canViewOwnTimecards: z.boolean().optional(),
  canEditTimecards: z.boolean().optional(),
  canApproveTimecards: z.boolean().optional(),
  canAssignWorkOrders: z.boolean().optional(),
  canManageCustomers: z.boolean().optional(),
  canViewReports: z.boolean().optional(),
  canExportPayroll: z.boolean().optional(),
  canManageTeam: z.boolean().optional(),
  canManageAdmin: z.boolean().optional(),
  canManageRoles: z.boolean().optional(),
  canManageBilling: z.boolean().optional(),
};

export const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional().nullable(),
  ...permissionFields,
});

export const updateRoleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional().nullable(),
  ...permissionFields,
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
