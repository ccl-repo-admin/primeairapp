import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, ownerProcedure } from "../trpc";

const companySettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  timezone: z.string().optional(),
  overtimeState: z.string().optional(),
  defaultBreakMinutes: z.number().int().min(0).max(120).optional(),
  geofenceRadiusFt: z.number().int().min(50).max(1000).optional(),
  requireFacePhoto: z.boolean().optional(),
  requireSignOff: z.boolean().optional(),
  payPeriodType: z.enum(["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY"]).optional(),
  payPeriodAnchorDate: z.coerce.date().nullable().optional(),
});

export const adminRouter = createTRPCRouter({
  getCompanySettings: adminProcedure.query(async ({ ctx }) => {
    const company = await ctx.db.company.findUnique({
      where: { id: ctx.companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        email: true,
        website: true,
        logoUrl: true,
        addressLine1: true,
        city: true,
        state: true,
        zip: true,
        timezone: true,
        plan: true,
        overtimeState: true,
        defaultBreakMinutes: true,
        geofenceRadiusFt: true,
        requireFacePhoto: true,
        requireSignOff: true,
        payPeriodType: true,
        payPeriodAnchorDate: true,
      },
    });
    if (!company) throw new TRPCError({ code: "NOT_FOUND" });
    return company;
  }),

  getPayPeriodConfig: adminProcedure.query(async ({ ctx }) => {
    const company = await ctx.db.company.findUnique({
      where: { id: ctx.companyId },
      select: { payPeriodType: true, payPeriodAnchorDate: true },
    });
    if (!company) throw new TRPCError({ code: "NOT_FOUND" });
    return company;
  }),

  updateCompanySettings: ownerProcedure
    .input(companySettingsSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.company.update({
        where: { id: ctx.companyId },
        data: input,
      });
    }),

  /** Hard-coded RBAC matrix — Phase 0 is read-only, Phase 2 adds overrides */
  listRolePermissions: adminProcedure.query(() => {
    return [
      { action: "Clock in/out (own)",    TECHNICIAN: true,  CREW_LEAD: true,  DISPATCHER: true,  OFFICE_ADMIN: true,  OWNER: true },
      { action: "View own timecards",    TECHNICIAN: true,  CREW_LEAD: true,  DISPATCHER: true,  OFFICE_ADMIN: true,  OWNER: true },
      { action: "Edit timecards",        TECHNICIAN: false, CREW_LEAD: false, DISPATCHER: false, OFFICE_ADMIN: true,  OWNER: true },
      { action: "Approve timecards",     TECHNICIAN: false, CREW_LEAD: false, DISPATCHER: true,  OFFICE_ADMIN: true,  OWNER: true },
      { action: "Assign work orders",    TECHNICIAN: false, CREW_LEAD: false, DISPATCHER: true,  OFFICE_ADMIN: true,  OWNER: true },
      { action: "Create customers",      TECHNICIAN: false, CREW_LEAD: false, DISPATCHER: true,  OFFICE_ADMIN: true,  OWNER: true },
      { action: "View reports",          TECHNICIAN: false, CREW_LEAD: false, DISPATCHER: true,  OFFICE_ADMIN: true,  OWNER: true },
      { action: "Manage team",           TECHNICIAN: false, CREW_LEAD: false, DISPATCHER: false, OFFICE_ADMIN: true,  OWNER: true },
      { action: "Admin settings",        TECHNICIAN: false, CREW_LEAD: false, DISPATCHER: false, OFFICE_ADMIN: false, OWNER: true },
      { action: "Billing",               TECHNICIAN: false, CREW_LEAD: false, DISPATCHER: false, OFFICE_ADMIN: false, OWNER: true },
    ];
  }),
});
