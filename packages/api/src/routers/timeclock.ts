import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  dispatcherProcedure,
  adminProcedure,
} from "../trpc";
import {
  clockInSchema,
  clockOutSchema,
  editTimeEntrySchema,
  listEntriesSchema,
} from "@primeair/validators";

export const timeclockRouter = createTRPCRouter({
  getActiveEntry: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.timeEntry.findFirst({
      where: {
        userId: ctx.userId,
        companyId: ctx.companyId,
        status: "ACTIVE",
        clockOutAt: null,
      },
      include: {
        workOrder: { select: { id: true, number: true, description: true } },
        breaks: { where: { endAt: null }, take: 1 },
      },
    });
  }),

  clockIn: protectedProcedure.input(clockInSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.timeEntry.findFirst({
      where: { userId: ctx.userId, companyId: ctx.companyId, status: "ACTIVE" },
    });
    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "Already clocked in" });
    }

    // Check daily / weekly hour limits
    const userLimits = await ctx.db.user.findUnique({
      where: { id: ctx.userId },
      select: { maxDailyMinutes: true, maxWeeklyMinutes: true },
    });

    if (userLimits?.maxDailyMinutes || userLimits?.maxWeeklyMinutes) {
      const now = new Date();

      if (userLimits.maxDailyMinutes) {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 86400000);
        const todayEntries = await ctx.db.timeEntry.findMany({
          where: {
            userId: ctx.userId!,
            companyId: ctx.companyId!,
            clockInAt: { gte: startOfDay, lt: endOfDay },
            status: { in: ["APPROVED", "PENDING"] },
          },
          select: { totalMinutes: true },
        });
        const todayMinutes = todayEntries.reduce((sum, e) => sum + (e.totalMinutes ?? 0), 0);
        if (todayMinutes >= userLimits.maxDailyMinutes) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Daily limit of ${Math.round(userLimits.maxDailyMinutes / 60 * 10) / 10}h reached. Contact your supervisor.`,
          });
        }
      }

      if (userLimits.maxWeeklyMinutes) {
        const day = now.getDay(); // 0=Sun, 1=Mon...
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday.getTime() + 7 * 86400000);
        const weekEntries = await ctx.db.timeEntry.findMany({
          where: {
            userId: ctx.userId!,
            companyId: ctx.companyId!,
            clockInAt: { gte: monday, lt: sunday },
            status: { in: ["APPROVED", "PENDING"] },
          },
          select: { totalMinutes: true },
        });
        const weekMinutes = weekEntries.reduce((sum, e) => sum + (e.totalMinutes ?? 0), 0);
        if (weekMinutes >= userLimits.maxWeeklyMinutes) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Weekly limit of ${Math.round(userLimits.maxWeeklyMinutes / 60 * 10) / 10}h reached. Contact your supervisor.`,
          });
        }
      }
    }

    return ctx.db.timeEntry.create({
      data: {
        companyId: ctx.companyId!,
        userId: ctx.userId!,
        workOrderId: input.workOrderId ?? null,
        projectId: input.projectId ?? null,
        costCodeId: input.costCodeId ?? null,
        clockInAt: new Date(),
        clockInLat: input.lat ?? null,
        clockInLng: input.lng ?? null,
        clockInPhoto: input.clockInPhotoUrl ?? null,
        clockInAddress: input.manualAddress ?? null,
        note: input.note ?? null,
        status: "ACTIVE",
      },
    });
  }),

  clockOut: protectedProcedure.input(clockOutSchema).mutation(async ({ ctx, input }) => {
    const entry = await ctx.db.timeEntry.findFirst({
      where: { userId: ctx.userId, companyId: ctx.companyId, status: "ACTIVE" },
      include: { breaks: true },
    });
    if (!entry) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No active shift" });
    }

    // Close any open break
    await ctx.db.break.updateMany({
      where: { timeEntryId: entry.id, endAt: null },
      data: { endAt: new Date() },
    });

    const clockOutAt = new Date();
    const totalMs = clockOutAt.getTime() - entry.clockInAt.getTime();
    const totalMinutes = Math.round(totalMs / 60000);
    const breakMinutes = entry.breaks.reduce((sum: number, b) => {
      if (b.endAt) {
        return sum + Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60000);
      }
      return sum;
    }, 0);

    return ctx.db.timeEntry.update({
      where: { id: entry.id },
      data: {
        clockOutAt,
        totalMinutes,
        breakMinutes,
        status: "PENDING",
      },
    });
  }),

  startBreak: protectedProcedure
    .input(z.object({ type: z.enum(["MEAL", "REST", "OTHER"]).default("MEAL") }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.timeEntry.findFirst({
        where: { userId: ctx.userId, companyId: ctx.companyId, status: "ACTIVE" },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "No active shift" });

      const openBreak = await ctx.db.break.findFirst({
        where: { timeEntryId: entry.id, endAt: null },
      });
      if (openBreak) throw new TRPCError({ code: "CONFLICT", message: "Break already active" });

      return ctx.db.break.create({
        data: { timeEntryId: entry.id, startAt: new Date(), type: input.type },
      });
    }),

  endBreak: protectedProcedure.mutation(async ({ ctx }) => {
    const entry = await ctx.db.timeEntry.findFirst({
      where: { userId: ctx.userId, companyId: ctx.companyId, status: "ACTIVE" },
    });
    if (!entry) throw new TRPCError({ code: "NOT_FOUND" });

    const openBreak = await ctx.db.break.findFirst({
      where: { timeEntryId: entry.id, endAt: null },
    });
    if (!openBreak) throw new TRPCError({ code: "NOT_FOUND", message: "No active break" });

    const endAt = new Date();
    const minutes = Math.round((endAt.getTime() - openBreak.startAt.getTime()) / 60000);
    return ctx.db.break.update({
      where: { id: openBreak.id },
      data: { endAt, minutes },
    });
  }),

  listEntries: dispatcherProcedure.input(listEntriesSchema).query(async ({ ctx, input }) => {
    return ctx.db.timeEntry.findMany({
      where: {
        companyId: ctx.companyId,
        ...(input.userId && { userId: input.userId }),
        ...(input.status && { status: input.status }),
        clockInAt: { gte: input.startDate, lte: input.endDate },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, color: true } },
        workOrder: { select: { id: true, number: true } },
        breaks: true,
      },
      orderBy: { clockInAt: "desc" },
      take: input.limit,
      skip: input.offset,
    });
  }),

  myEntries: protectedProcedure
    .input(z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.timeEntry.findMany({
        where: {
          companyId: ctx.companyId,
          userId: ctx.userId,
          clockInAt: { gte: input.startDate, lte: input.endDate },
        },
        include: {
          workOrder: { select: { id: true, number: true } },
          breaks: true,
        },
        orderBy: { clockInAt: "desc" },
      });
    }),

  approveEntries: dispatcherProcedure
    .input(z.object({ ids: z.array(z.string().min(1)).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.timeEntry.updateMany({
        where: {
          id: { in: input.ids },
          companyId: ctx.companyId,
          status: "PENDING",
        },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedById: ctx.userId,
        },
      });
    }),

  rejectEntry: dispatcherProcedure
    .input(z.object({ id: z.string().min(1), reason: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.timeEntry.findFirst({
        where: { id: input.id, companyId: ctx.companyId, status: "PENDING" },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found or not pending" });

      return ctx.db.timeEntry.update({
        where: { id: input.id },
        data: { status: "REJECTED", note: input.reason },
      });
    }),

  addNote: protectedProcedure
    .input(z.object({ id: z.string().min(1), note: z.string().max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.timeEntry.findFirst({
        where: {
          id: input.id,
          companyId: ctx.companyId,
          // Techs can only note their own; dispatchers+ can note any
          ...(!ctx.permissions?.canApproveTimecards && {
            userId: ctx.userId,
          }),
        },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.timeEntry.update({ where: { id: input.id }, data: { note: input.note } });
    }),

  adminClockOut: dispatcherProcedure
    .input(z.object({
      timeEntryId: z.string().min(1),
      clockOutAt: z.coerce.date().optional(),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.timeEntry.findFirst({
        where: { id: input.timeEntryId, companyId: ctx.companyId, status: "ACTIVE" },
        include: { breaks: true },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Active entry not found" });

      // If no time provided, default to now. If seed/test data has a future clockInAt, use that + 1min.
      const rawClockOut = input.clockOutAt ?? new Date();
      const clockOutAt = rawClockOut > entry.clockInAt ? rawClockOut : new Date(entry.clockInAt.getTime() + 60000);

      // Close any open break first
      await ctx.db.break.updateMany({
        where: { timeEntryId: entry.id, endAt: null },
        data: { endAt: clockOutAt },
      });

      const totalMs = clockOutAt.getTime() - entry.clockInAt.getTime();
      const totalMinutes = Math.round(totalMs / 60000);
      const breakMinutes = entry.breaks.reduce((sum: number, b) => {
        if (b.endAt) return sum + Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60000);
        return sum;
      }, 0);

      const [updated] = await ctx.db.$transaction([
        ctx.db.timeEntry.update({
          where: { id: entry.id },
          data: { clockOutAt, totalMinutes, breakMinutes, status: "PENDING" },
        }),
        ctx.db.timeEntryEdit.create({
          data: {
            timeEntryId: entry.id,
            editedById: ctx.userId!,
            field: "adminClockOut",
            oldValue: "ACTIVE",
            newValue: clockOutAt.toISOString(),
            reason: input.reason ?? "Manual clock-out by admin",
          },
        }),
      ]);

      return updated;
    }),

  getEditHistory: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const entry = await ctx.db.timeEntry.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.timeEntryEdit.findMany({
        where: { timeEntryId: input.id },
        include: { editedBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { editedAt: "desc" },
      });
    }),

  editEntry: adminProcedure
    .input(editTimeEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.db.timeEntry.findFirst({
        where: { id: input.timeEntryId, companyId: ctx.companyId },
      });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });

      const updates: Record<string, unknown> = {};
      const edits: Array<{ field: string; oldValue: string; newValue: string }> = [];

      if (input.clockInAt) {
        edits.push({ field: "clockInAt", oldValue: entry.clockInAt.toISOString(), newValue: input.clockInAt.toISOString() });
        updates.clockInAt = input.clockInAt;
      }
      if (input.clockOutAt) {
        edits.push({ field: "clockOutAt", oldValue: entry.clockOutAt?.toISOString() ?? "", newValue: input.clockOutAt.toISOString() });
        updates.clockOutAt = input.clockOutAt;
      }
      if (input.breakMinutes !== undefined) {
        edits.push({ field: "breakMinutes", oldValue: String(entry.breakMinutes), newValue: String(input.breakMinutes) });
        updates.breakMinutes = input.breakMinutes;
      }

      const [updated] = await ctx.db.$transaction([
        ctx.db.timeEntry.update({ where: { id: input.timeEntryId }, data: updates }),
        ...edits.map((e) =>
          ctx.db.timeEntryEdit.create({
            data: {
              timeEntryId: input.timeEntryId,
              editedById: ctx.userId!,
              field: e.field,
              oldValue: e.oldValue,
              newValue: e.newValue,
              reason: input.reason,
            },
          })
        ),
      ]);

      return updated;
    }),
});
