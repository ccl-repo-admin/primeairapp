import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  dispatcherProcedure,
  adminProcedure,
} from "../trpc";
import { createCostCodeSchema, updateCostCodeSchema } from "@primeair/validators";

export const costCodesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().min(1).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.costCode.findMany({
        where: {
          companyId: ctx.companyId,
          ...(input.projectId && { projectId: input.projectId }),
        },
        orderBy: { code: "asc" },
      });
    }),

  create: dispatcherProcedure.input(createCostCodeSchema).mutation(async ({ ctx, input }) => {
    const exists = await ctx.db.costCode.findFirst({
      where: { companyId: ctx.companyId, code: input.code.toUpperCase() },
    });
    if (exists) throw new TRPCError({ code: "CONFLICT", message: `Cost code ${input.code} already exists` });

    return ctx.db.costCode.create({
      data: {
        companyId: ctx.companyId!,
        code: input.code.toUpperCase(),
        description: input.description ?? null,
        projectId: input.projectId ?? null,
      },
    });
  }),

  update: adminProcedure
    .input(z.object({ id: z.string().min(1) }).merge(updateCostCodeSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const cc = await ctx.db.costCode.findFirst({ where: { id, companyId: ctx.companyId } });
      if (!cc) throw new TRPCError({ code: "NOT_FOUND" });

      if (data.code && data.code.toUpperCase() !== cc.code) {
        const exists = await ctx.db.costCode.findFirst({
          where: { companyId: ctx.companyId, code: data.code.toUpperCase() },
        });
        if (exists) throw new TRPCError({ code: "CONFLICT", message: `Cost code ${data.code} already exists` });
      }

      return ctx.db.costCode.update({
        where: { id },
        data: {
          ...(data.code && { code: data.code.toUpperCase() }),
          ...(data.description !== undefined && { description: data.description }),
        },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const cc = await ctx.db.costCode.findFirst({ where: { id: input.id, companyId: ctx.companyId } });
      if (!cc) throw new TRPCError({ code: "NOT_FOUND" });

      const inUse = await ctx.db.timeEntry.count({ where: { costCodeId: input.id } });
      if (inUse > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Cannot delete: ${inUse} time entries reference this cost code`,
        });
      }

      return ctx.db.costCode.delete({ where: { id: input.id } });
    }),
});
