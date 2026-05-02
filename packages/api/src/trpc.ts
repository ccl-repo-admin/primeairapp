import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { type Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      companyId: ctx.session.user.companyId,
      userId: ctx.session.user.id,
      roleId: ctx.session.user.roleId,
      roleName: ctx.session.user.roleName,
      permissions: ctx.session.user.permissions,
      jobType: ctx.session.user.jobType,
    },
  });
});

/** Dispatcher-level: canApproveTimecards */
export const dispatcherProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.permissions?.canApproveTimecards) throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

/** Admin-level: canManageAdmin (cost codes, company settings) */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.permissions?.canManageAdmin) throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

/** Team management: canManageTeam (create/edit/deactivate users) */
export const manageTeamProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.permissions?.canManageTeam) throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

/** Owner-level: canManageRoles */
export const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.permissions?.canManageRoles) throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

/** Payroll export: canExportPayroll */
export const exportPayrollProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.permissions?.canExportPayroll) throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});
