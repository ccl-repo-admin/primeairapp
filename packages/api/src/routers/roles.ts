import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, ownerProcedure } from "../trpc";
import { createRoleSchema, updateRoleSchema } from "@primeair/validators";

export const rolesRouter = createTRPCRouter({
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.role.findMany({
      where: { companyId: ctx.companyId },
      include: { _count: { select: { users: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }),

  create: ownerProcedure.input(createRoleSchema).mutation(async ({ ctx, input }) => {
    return ctx.db.role.create({
      data: {
        companyId: ctx.companyId!,
        name: input.name,
        description: input.description ?? null,
        isBuiltIn: false,
        sortOrder: 99,
        hubAccess: input.hubAccess ?? false,
        timeclockAccess: input.timeclockAccess ?? false,
        canClockIn: input.canClockIn ?? false,
        canViewOwnTimecards: input.canViewOwnTimecards ?? false,
        canEditTimecards: input.canEditTimecards ?? false,
        canApproveTimecards: input.canApproveTimecards ?? false,
        canAssignWorkOrders: input.canAssignWorkOrders ?? false,
        canManageCustomers: input.canManageCustomers ?? false,
        canViewReports: input.canViewReports ?? false,
        canExportPayroll: input.canExportPayroll ?? false,
        canManageTeam: input.canManageTeam ?? false,
        canManageAdmin: input.canManageAdmin ?? false,
        canManageRoles: input.canManageRoles ?? false,
        canManageBilling: input.canManageBilling ?? false,
      },
    });
  }),

  update: ownerProcedure.input(updateRoleSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const role = await ctx.db.role.findFirst({ where: { id, companyId: ctx.companyId } });
    if (!role) throw new TRPCError({ code: "NOT_FOUND" });
    if (role.isBuiltIn) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Built-in role permissions cannot be modified. Create a custom role instead." });
    }
    return ctx.db.role.update({ where: { id }, data });
  }),

  delete: ownerProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.db.role.findFirst({ where: { id: input.id, companyId: ctx.companyId } });
      if (!role) throw new TRPCError({ code: "NOT_FOUND" });
      if (role.isBuiltIn) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete built-in roles" });
      }
      const userCount = await ctx.db.user.count({ where: { roleId: input.id } });
      if (userCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${userCount} user${userCount > 1 ? "s have" : " has"} this role. Reassign them first.`,
        });
      }
      return ctx.db.role.delete({ where: { id: input.id } });
    }),
});
