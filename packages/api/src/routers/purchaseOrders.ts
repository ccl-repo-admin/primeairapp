import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, dispatcherProcedure } from "../trpc";

const poImportRowSchema = z.object({
  number: z.string().min(1),
  description: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  dueAt: z.string().optional().nullable(),
  amount: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const purchaseOrdersRouter = createTRPCRouter({
  list: dispatcherProcedure
    .input(z.object({
      status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETE", "CANCELLED"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.purchaseOrder.findMany({
        where: {
          companyId: ctx.companyId!,
          ...(input?.status ? { status: input.status } : {}),
        },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          _count: { select: { timeEntries: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  updateStatus: dispatcherProcedure
    .input(z.object({
      id: z.string().min(1),
      status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETE", "CANCELLED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.id, companyId: ctx.companyId! },
      });
      if (!po) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.purchaseOrder.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  bulkImport: dispatcherProcedure
    .input(z.array(poImportRowSchema).min(1).max(500))
    .mutation(async ({ ctx, input }) => {
      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const row of input) {
        try {
          const existing = await ctx.db.purchaseOrder.findFirst({
            where: { companyId: ctx.companyId!, number: row.number },
          });
          if (existing) { skipped++; continue; }

          let dueAt: Date | null = null;
          if (row.dueAt) {
            const d = new Date(row.dueAt);
            if (!isNaN(d.getTime())) dueAt = d;
          }

          await ctx.db.purchaseOrder.create({
            data: {
              companyId: ctx.companyId!,
              number: row.number,
              description: row.description ?? null,
              notes: row.notes ?? null,
              dueAt,
              amount: row.amount ?? null,
              status: "OPEN",
            },
          });
          created++;
        } catch (e) {
          errors.push(`PO ${row.number}: ${e instanceof Error ? e.message : "unknown error"}`);
        }
      }

      return { created, skipped, failed: errors.length, errors };
    }),
});
