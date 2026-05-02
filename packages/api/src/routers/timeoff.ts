import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  dispatcherProcedure,
  adminProcedure,
} from "../trpc";
import {
  requestTimeOffSchema,
  reviewTimeOffSchema,
  createTimeOffPolicySchema,
} from "@primeair/validators";

export const timeoffRouter = createTRPCRouter({
  // Policies

  listPolicies: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.timeOffPolicy.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { name: "asc" },
    });
  }),

  createPolicy: adminProcedure.input(createTimeOffPolicySchema).mutation(async ({ ctx, input }) => {
    return ctx.db.timeOffPolicy.create({
      data: {
        companyId: ctx.companyId!,
        name: input.name,
        type: input.type,
        accrualEnabled: input.accrualEnabled,
        accrualRateHoursPerYear: input.accrualRateHoursPerYear ?? null,
        maxBalanceHours: input.maxBalanceHours ?? null,
        maxRequestDays: input.maxRequestDays,
      },
    });
  }),

  deletePolicy: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const policy = await ctx.db.timeOffPolicy.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!policy) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.timeOffPolicy.delete({ where: { id: input.id } });
    }),

  // Requests — employee-facing

  myRequests: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.timeOffRequest.findMany({
        where: { userId: ctx.userId },
        include: { policy: { select: { name: true, type: true } } },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  request: protectedProcedure.input(requestTimeOffSchema).mutation(async ({ ctx, input }) => {
    const policy = await ctx.db.timeOffPolicy.findFirst({
      where: { id: input.policyId, companyId: ctx.companyId },
    });
    if (!policy) throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });

    // Prevent overlapping requests
    const days = Math.ceil(
      (input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    if (days > policy.maxRequestDays) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Maximum ${policy.maxRequestDays} days per request for this policy`,
      });
    }

    const overlapping = await ctx.db.timeOffRequest.findFirst({
      where: {
        userId: ctx.userId,
        status: { not: "REJECTED" },
        startDate: { lte: input.endDate },
        endDate: { gte: input.startDate },
      },
    });
    if (overlapping) {
      throw new TRPCError({ code: "CONFLICT", message: "Overlapping time-off request already exists" });
    }

    return ctx.db.timeOffRequest.create({
      data: {
        userId: ctx.userId!,
        policyId: input.policyId,
        startDate: input.startDate,
        endDate: input.endDate,
        hoursPerDay: input.hoursPerDay,
        reason: input.reason ?? null,
        status: "PENDING",
      },
    });
  }),

  cancelRequest: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.db.timeOffRequest.findFirst({
        where: { id: input.id, userId: ctx.userId, status: "PENDING" },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found or already reviewed" });
      return ctx.db.timeOffRequest.delete({ where: { id: input.id } });
    }),

  // Admin / dispatcher — review queue

  listRequests: dispatcherProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
        userId: z.string().min(1).optional(),
        limit: z.number().int().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.timeOffRequest.findMany({
        where: {
          user: { companyId: ctx.companyId },
          ...(input.status && { status: input.status }),
          ...(input.userId && { userId: input.userId }),
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, color: true } },
          policy: { select: { name: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  review: dispatcherProcedure.input(reviewTimeOffSchema).mutation(async ({ ctx, input }) => {
    const req = await ctx.db.timeOffRequest.findFirst({
      where: { id: input.requestId, user: { companyId: ctx.companyId }, status: "PENDING" },
    });
    if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found or already reviewed" });

    return ctx.db.timeOffRequest.update({
      where: { id: input.requestId },
      data: {
        status: input.status,
        reviewedById: ctx.userId,
        reviewedAt: new Date(),
        reviewNote: input.reviewNote ?? null,
      },
    });
  }),
});
