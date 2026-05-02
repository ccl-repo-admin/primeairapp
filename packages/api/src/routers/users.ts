import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
  manageTeamProcedure,
  ownerProcedure,
} from "../trpc";
import {
  createUserSchema,
  updateUserSchema,
  bulkImportSchema,
} from "@primeair/validators";

export const usersRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        roleId: z.string().optional(),
        jobType: z
          .enum(["SERVICE_TECH", "INSTALLER", "OFFICE_STAFF"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.roleId && { roleId: input.roleId }),
          ...(input.jobType && { jobType: input.jobType }),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: { select: { id: true, name: true } },
          jobType: true,
          payType: true,
          hourlyRate: true,
          title: true,
          color: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          role: { select: { id: true, name: true } },
          timeEntries: {
            orderBy: { clockInAt: "desc" },
            take: 10,
            select: {
              id: true,
              clockInAt: true,
              clockOutAt: true,
              totalMinutes: true,
              status: true,
            },
          },
        },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      return user;
    }),

  create: manageTeamProcedure.input(createUserSchema).mutation(async ({ ctx, input }) => {
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    if (input.email) {
      const exists = await ctx.db.user.findFirst({
        where: { companyId: ctx.companyId, email: input.email },
      });
      if (exists) throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
    }

    if (input.phone) {
      const exists = await ctx.db.user.findFirst({
        where: { companyId: ctx.companyId, phone: input.phone },
      });
      if (exists) throw new TRPCError({ code: "CONFLICT", message: "Phone already in use" });
    }

    // Resolve roleId — if not provided, fall back to the Technician built-in role
    let roleId = input.roleId;
    if (!roleId) {
      const defaultRole = await ctx.db.role.findFirst({
        where: { companyId: ctx.companyId, name: "Technician" },
      });
      if (!defaultRole) throw new TRPCError({ code: "NOT_FOUND", message: "No default role found. Please create a Technician role first." });
      roleId = defaultRole.id;
    }

    return ctx.db.user.create({
      data: {
        companyId: ctx.companyId!,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        roleId,
        jobType: input.jobType ?? "SERVICE_TECH",
        payType: input.payType ?? "HOURLY",
        hourlyRate: input.hourlyRate ?? null,
        title: input.title ?? null,
        color: input.color ?? null,
        passwordHash,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: { select: { id: true, name: true } },
        jobType: true,
      },
    });
  }),

  update: manageTeamProcedure
    .input(z.object({ id: z.string().min(1) }).merge(updateUserSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const user = await ctx.db.user.findFirst({
        where: { id, companyId: ctx.companyId },
        include: { role: true },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      if (data.roleId) {
        const newRole = await ctx.db.role.findFirst({ where: { id: data.roleId, companyId: ctx.companyId } });
        if (!newRole) throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
        if (!ctx.permissions?.canManageRoles && (newRole.canManageAdmin || newRole.canManageRoles)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only role managers can assign admin-level roles" });
        }
        // Prevent demoting the last role manager
        if (user.role.canManageRoles && !newRole.canManageRoles) {
          const mgCount = await ctx.db.user.count({
            where: { companyId: ctx.companyId, isActive: true, role: { canManageRoles: true } },
          });
          if (mgCount <= 1) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove the only role manager" });
          }
        }
      }

      return ctx.db.user.update({
        where: { id },
        data: {
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.lastName && { lastName: data.lastName }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.roleId && { roleId: data.roleId }),
          ...(data.jobType && { jobType: data.jobType }),
          ...(data.payType && { payType: data.payType }),
          ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
          ...(data.title !== undefined && { title: data.title }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.maxDailyMinutes !== undefined && { maxDailyMinutes: data.maxDailyMinutes }),
          ...(data.maxWeeklyMinutes !== undefined && { maxWeeklyMinutes: data.maxWeeklyMinutes }),
        },
      });
    }),

  deactivate: manageTeamProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: { role: true },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      if (user.role.canManageRoles) {
        const mgCount = await ctx.db.user.count({
          where: { companyId: ctx.companyId, isActive: true, role: { canManageRoles: true } },
        });
        if (mgCount <= 1) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot deactivate the only role manager" });
      }
      return ctx.db.user.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  bulkImport: manageTeamProcedure
    .input(bulkImportSchema)
    .mutation(async ({ ctx, input }) => {
      const results = { created: 0, skipped: 0, failed: 0, errors: [] as string[] };

      // Build role name → id map for this company
      const roleMap = new Map<string, string>(); // name (lowercase) → id
      const allRoles = await ctx.db.role.findMany({ where: { companyId: ctx.companyId } });
      allRoles.forEach((r) => roleMap.set(r.name.toLowerCase(), r.id));
      const defaultRoleId = allRoles.find((r) => r.name === "Technician")?.id ?? allRoles[0]?.id;

      for (const row of input) {
        try {
          const phoneClean = row.phone?.replace(/\D/g, "") || null;
          const emailLower = row.email?.toLowerCase() || null;

          const existsByEmail = emailLower
            ? await ctx.db.user.findFirst({ where: { companyId: ctx.companyId, email: emailLower } })
            : null;
          const existsByPhone = phoneClean
            ? await ctx.db.user.findFirst({ where: { companyId: ctx.companyId, phone: phoneClean } })
            : null;

          if (existsByEmail || existsByPhone) {
            results.skipped++;
            continue;
          }

          const tempPassword = Math.random().toString(36).slice(-8);
          const passwordHash = await bcrypt.hash(tempPassword, 10);

          await ctx.db.user.create({
            data: {
              companyId: ctx.companyId!,
              firstName: row.firstName,
              lastName: row.lastName,
              email: emailLower,
              phone: phoneClean,
              roleId: roleMap.get((row.roleName ?? "").toLowerCase()) ?? defaultRoleId!,
              jobType: row.jobType,
              payType: "HOURLY",
              hourlyRate: row.hourlyRate ?? null,
              title: row.title ?? null,
              passwordHash,
            },
          });
          results.created++;
        } catch (err) {
          results.failed++;
          results.errors.push(`${row.firstName} ${row.lastName}: ${String(err)}`);
        }
      }

      return results;
    }),
});
