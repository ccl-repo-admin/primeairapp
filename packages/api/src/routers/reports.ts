import { z } from "zod";
import { createTRPCRouter, dispatcherProcedure } from "../trpc";
import { laborReportSchema, timecardExportSchema } from "@primeair/validators";

// Daily OT threshold: 8h regular, 10h+ = double time
// Weekly OT threshold: 40h/wk regular, 48h+ = double time
function classifyMinutes(totalMin: number, priorWeeklyMin: number) {
  const DAILY_REGULAR = 480; // 8h
  const DAILY_OT = 600; // 10h → above is DT
  const WEEKLY_REGULAR = 2400; // 40h
  const WEEKLY_OT = 2880; // 48h → above is DT

  const dailyRegular = Math.min(totalMin, DAILY_REGULAR);
  const dailyOt = Math.max(0, Math.min(totalMin, DAILY_OT) - DAILY_REGULAR);
  const dailyDt = Math.max(0, totalMin - DAILY_OT);

  // Also check weekly thresholds and take the higher classification
  const weeklyOtStart = Math.max(0, WEEKLY_REGULAR - priorWeeklyMin);
  const weeklyDtStart = Math.max(0, WEEKLY_OT - priorWeeklyMin);

  let regularMinutes = Math.min(dailyRegular, weeklyOtStart);
  let overtimeMinutes = dailyOt + Math.max(0, dailyRegular - weeklyOtStart);
  let doubleTimeMinutes = dailyDt;

  if (priorWeeklyMin >= WEEKLY_OT) {
    // All hours are double time this day
    regularMinutes = 0;
    overtimeMinutes = 0;
    doubleTimeMinutes = totalMin;
  } else if (priorWeeklyMin >= WEEKLY_REGULAR) {
    // All additional hours OT or DT
    overtimeMinutes = Math.max(overtimeMinutes, Math.min(totalMin, weeklyDtStart - priorWeeklyMin));
  }

  return { regularMinutes, overtimeMinutes, doubleTimeMinutes };
}

export const reportsRouter = createTRPCRouter({
  laborSummary: dispatcherProcedure
    .input(laborReportSchema)
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.timeEntry.findMany({
        where: {
          companyId: ctx.companyId,
          status: "APPROVED",
          clockInAt: { gte: input.startDate },
          clockOutAt: { lte: input.endDate },
          ...(input.userId && { userId: input.userId }),
          ...(input.costCodeId && { costCodeId: input.costCodeId }),
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, hourlyRate: true, payType: true },
          },
        },
        orderBy: { clockInAt: "asc" },
      });

      const byUser = new Map<string, {
        userId: string; name: string; hourlyRate: number;
        regularMinutes: number; overtimeMinutes: number; doubleTimeMinutes: number; totalPay: number;
      }>();

      // Group by user and sort chronologically for weekly OT tracking
      const entriesByUser = new Map<string, typeof entries>();
      for (const entry of entries) {
        if (!entriesByUser.has(entry.userId)) entriesByUser.set(entry.userId, []);
        entriesByUser.get(entry.userId)!.push(entry);
      }

      for (const [userId, userEntries] of entriesByUser) {
        const user = userEntries[0]!.user;
        let weeklyMinutes = 0;
        let weekStart = userEntries[0]!.clockInAt;

        const row = {
          userId,
          name: `${user.firstName} ${user.lastName}`,
          hourlyRate: Number(user.hourlyRate ?? 0),
          regularMinutes: 0,
          overtimeMinutes: 0,
          doubleTimeMinutes: 0,
          totalPay: 0,
        };

        for (const entry of userEntries) {
          // Reset weekly counter on new work week (Mon)
          const dayMs = entry.clockInAt.getTime() - weekStart.getTime();
          if (dayMs >= 7 * 24 * 60 * 60 * 1000) {
            weeklyMinutes = 0;
            weekStart = entry.clockInAt;
          }

          const totalMin = entry.totalMinutes ?? 0;
          const classified = classifyMinutes(totalMin, weeklyMinutes);
          row.regularMinutes += classified.regularMinutes;
          row.overtimeMinutes += classified.overtimeMinutes;
          row.doubleTimeMinutes += classified.doubleTimeMinutes;
          weeklyMinutes += totalMin;
        }

        const rate = row.hourlyRate;
        row.totalPay =
          (row.regularMinutes / 60) * rate +
          (row.overtimeMinutes / 60) * rate * 1.5 +
          (row.doubleTimeMinutes / 60) * rate * 2;

        byUser.set(userId, row);
      }

      return {
        rows: Array.from(byUser.values()),
        totalEntries: entries.length,
        dateRange: { start: input.startDate, end: input.endDate },
      };
    }),

  overtimeSummary: dispatcherProcedure
    .input(z.object({ weekStart: z.coerce.date(), weekEnd: z.coerce.date().optional() }))
    .query(async ({ ctx, input }) => {
      const weekEnd = input.weekEnd ?? new Date(input.weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const entries = await ctx.db.timeEntry.findMany({
        where: {
          companyId: ctx.companyId,
          status: { in: ["APPROVED", "PENDING"] },
          clockInAt: { gte: input.weekStart, lte: weekEnd },
          clockOutAt: { not: null },
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: { select: { name: true } }, hourlyRate: true } },
        },
        orderBy: { clockInAt: "asc" },
      });

      const byUser = new Map<string, {
        userId: string; name: string; role: string; hourlyRate: number;
        totalMinutes: number; regularMinutes: number; overtimeMinutes: number; doubleTimeMinutes: number;
        entries: number;
      }>();

      for (const entry of entries) {
        if (!byUser.has(entry.userId)) {
          byUser.set(entry.userId, {
            userId: entry.userId,
            name: `${entry.user.firstName} ${entry.user.lastName}`,
            role: entry.user.role.name,
            hourlyRate: Number(entry.user.hourlyRate ?? 0),
            totalMinutes: 0,
            regularMinutes: 0,
            overtimeMinutes: 0,
            doubleTimeMinutes: 0,
            entries: 0,
          });
        }
        const row = byUser.get(entry.userId)!;
        const min = entry.totalMinutes ?? 0;
        row.totalMinutes += min;
        row.entries++;
        // Simple weekly OT: first 2400 min regular, next 480 OT, rest DT
        const totalSoFar = row.totalMinutes;
        if (totalSoFar <= 2400) {
          row.regularMinutes += min;
        } else if (totalSoFar - min < 2400) {
          row.regularMinutes += 2400 - (totalSoFar - min);
          row.overtimeMinutes += totalSoFar - 2400;
        } else if (totalSoFar <= 2880) {
          row.overtimeMinutes += min;
        } else if (totalSoFar - min < 2880) {
          row.overtimeMinutes += 2880 - (totalSoFar - min);
          row.doubleTimeMinutes += totalSoFar - 2880;
        } else {
          row.doubleTimeMinutes += min;
        }
      }

      return {
        weekStart: input.weekStart,
        weekEnd,
        rows: Array.from(byUser.values()).sort((a, b) => b.overtimeMinutes - a.overtimeMinutes),
      };
    }),

  timecardExport: dispatcherProcedure
    .input(timecardExportSchema)
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.timeEntry.findMany({
        where: {
          companyId: ctx.companyId,
          status: input.status,
          clockInAt: { gte: input.startDate },
          clockOutAt: { lte: input.endDate },
        },
        include: {
          user: { select: { firstName: true, lastName: true, hourlyRate: true } },
          workOrder: { select: { number: true } },
          costCode: { select: { code: true } },
        },
        orderBy: [{ userId: "asc" }, { clockInAt: "asc" }],
      });

      if (input.format === "qb_iif") {
        const header = "!TIMETRACKING\tVENDOR\tDATE\tJOBNAME\tITEM\tDURATION\tNOTES\n";
        const iifRows = entries.map((e) => {
          const date = e.clockInAt.toLocaleDateString("en-US");
          const hours = ((e.totalMinutes ?? 0) / 60).toFixed(2);
          const jobName = e.workOrder?.number ? `WO-${e.workOrder.number}` : "";
          return `TIMETRACKING\t${e.user.firstName} ${e.user.lastName}\t${date}\t${jobName}\t${e.costCode?.code ?? ""}\t${hours}\t${e.note ?? ""}`;
        });
        return { format: "qb_iif" as const, content: header + iifRows.join("\n") };
      }

      // Generic CSV
      const header = "First Name,Last Name,Date,Clock In,Clock Out,Total Hours,Break Min,Regular Hrs,OT Hrs,DT Hrs,Work Order,Cost Code,Hourly Rate,Note\n";
      const rows = entries.map((e) => {
        const date = e.clockInAt.toLocaleDateString("en-US");
        const clockIn = e.clockInAt.toLocaleTimeString("en-US", { hour12: false });
        const clockOut = e.clockOutAt?.toLocaleTimeString("en-US", { hour12: false }) ?? "";
        const total = ((e.totalMinutes ?? 0) / 60).toFixed(2);
        const reg = ((e.regularMinutes ?? 0) / 60).toFixed(2);
        const ot = ((e.overtimeMinutes ?? 0) / 60).toFixed(2);
        const dt = ((e.doubleTimeMinutes ?? 0) / 60).toFixed(2);
        const note = (e.note ?? "").replace(/,/g, ";");
        return `${e.user.firstName},${e.user.lastName},${date},${clockIn},${clockOut},${total},${e.breakMinutes},${reg},${ot},${dt},WO-${e.workOrder?.number ?? ""},${e.costCode?.code ?? ""},${e.user.hourlyRate ?? ""},${note}`;
      });
      return { format: "csv" as const, content: header + rows.join("\n") };
    }),

  payrollExport: dispatcherProcedure
    .input(z.object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      format: z.enum(["csv", "gusto", "adp"]).default("csv"),
    }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.timeEntry.findMany({
        where: {
          companyId: ctx.companyId,
          status: "APPROVED",
          clockInAt: { gte: input.startDate },
          clockOutAt: { lte: input.endDate },
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, hourlyRate: true, payType: true },
          },
        },
        orderBy: [{ userId: "asc" }, { clockInAt: "asc" }],
      });

      // Aggregate by user
      const byUser = new Map<string, {
        firstName: string; lastName: string; payType: string; hourlyRate: number;
        regularHours: number; overtimeHours: number; doubleTimeHours: number; totalPay: number;
      }>();

      for (const entry of entries) {
        const key = entry.userId;
        if (!byUser.has(key)) {
          byUser.set(key, {
            firstName: entry.user.firstName,
            lastName: entry.user.lastName,
            payType: entry.user.payType,
            hourlyRate: Number(entry.user.hourlyRate ?? 0),
            regularHours: 0,
            overtimeHours: 0,
            doubleTimeHours: 0,
            totalPay: 0,
          });
        }
        const row = byUser.get(key)!;
        row.regularHours += (entry.regularMinutes ?? entry.totalMinutes ?? 0) / 60;
        row.overtimeHours += (entry.overtimeMinutes ?? 0) / 60;
        row.doubleTimeHours += (entry.doubleTimeMinutes ?? 0) / 60;
      }

      for (const row of byUser.values()) {
        row.totalPay =
          row.regularHours * row.hourlyRate +
          row.overtimeHours * row.hourlyRate * 1.5 +
          row.doubleTimeHours * row.hourlyRate * 2;
      }

      const periodStr = `${input.startDate.toLocaleDateString("en-US")} - ${input.endDate.toLocaleDateString("en-US")}`;

      if (input.format === "gusto") {
        // Gusto CSV format
        const header = "Employee First Name,Employee Last Name,Regular Hours,Overtime Hours,Double Time Hours,Pay Period\n";
        const rows = Array.from(byUser.values()).map((r) =>
          `${r.firstName},${r.lastName},${r.regularHours.toFixed(2)},${r.overtimeHours.toFixed(2)},${r.doubleTimeHours.toFixed(2)},${periodStr}`
        );
        return { format: "gusto" as const, content: header + rows.join("\n"), period: periodStr };
      }

      if (input.format === "adp") {
        // ADP WorkforceNow format (simplified)
        const header = "Co Code,Batch ID,File #,Temp Dept,Reg Hours,O/T Hours,Earnings 3 Code,Earnings 3 Amount\n";
        const rows = Array.from(byUser.values()).map((r, i) =>
          `PRIME,001,${String(i + 1).padStart(6, "0")},,${r.regularHours.toFixed(2)},${r.overtimeHours.toFixed(2)},,`
        );
        return { format: "adp" as const, content: header + rows.join("\n"), period: periodStr };
      }

      // Generic CSV
      const header = "First Name,Last Name,Pay Type,Hourly Rate,Regular Hours,OT Hours,DT Hours,Gross Pay,Pay Period\n";
      const rows = Array.from(byUser.values()).map((r) =>
        `${r.firstName},${r.lastName},${r.payType},${r.hourlyRate.toFixed(2)},${r.regularHours.toFixed(2)},${r.overtimeHours.toFixed(2)},${r.doubleTimeHours.toFixed(2)},${r.totalPay.toFixed(2)},${periodStr}`
      );
      return { format: "csv" as const, content: header + rows.join("\n"), period: periodStr };
    }),

  costCodeSummary: dispatcherProcedure
    .input(z.object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      workOrderId: z.string().min(1).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db.timeEntry.findMany({
        where: {
          companyId: ctx.companyId,
          status: "APPROVED",
          clockInAt: { gte: input.startDate },
          clockOutAt: { lte: input.endDate },
          costCodeId: { not: null },
          ...(input.workOrderId && { workOrderId: input.workOrderId }),
        },
        include: {
          costCode: { select: { code: true, description: true } },
          user: { select: { hourlyRate: true } },
        },
      });

      const byCode = new Map<string, {
        code: string; description: string | null;
        totalMinutes: number; laborCost: number; entryCount: number;
      }>();

      for (const entry of entries) {
        if (!entry.costCode) continue;
        const key = entry.costCodeId!;
        if (!byCode.has(key)) {
          byCode.set(key, {
            code: entry.costCode.code,
            description: entry.costCode.description,
            totalMinutes: 0,
            laborCost: 0,
            entryCount: 0,
          });
        }
        const row = byCode.get(key)!;
        row.totalMinutes += entry.totalMinutes ?? 0;
        row.laborCost += ((entry.totalMinutes ?? 0) / 60) * Number(entry.user.hourlyRate ?? 0);
        row.entryCount++;
      }

      return {
        rows: Array.from(byCode.values()).sort((a, b) => b.laborCost - a.laborCost),
        dateRange: { start: input.startDate, end: input.endDate },
      };
    }),

  clockedInNow: dispatcherProcedure.query(async ({ ctx }) => {
    return ctx.db.timeEntry.findMany({
      where: { companyId: ctx.companyId, status: "ACTIVE" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, color: true, jobType: true } },
        workOrder: { select: { number: true, description: true } },
      },
      orderBy: { clockInAt: "asc" },
    });
  }),
});
