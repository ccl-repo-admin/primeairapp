import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, dispatcherProcedure } from "../trpc";

const CLOSEABLE_FINANCIAL = ["PAID", "VOID"];
const CANCELLABLE_FINANCIAL = ["UNPAID", "VOID"];

function parseCurrency(val: string | null | undefined): number | null {
  if (!val) return null;
  const n = parseFloat(val.replace(/[$,\s]/g, ""));
  return isNaN(n) ? null : n;
}

function parseDate(val: string | null | undefined): Date | null {
  if (!val || !val.trim()) return null;
  const d = new Date(val.trim());
  return isNaN(d.getTime()) ? null : d;
}

function parseBool(val: string | null | undefined): boolean | null {
  if (!val) return null;
  const v = val.trim().toLowerCase();
  if (v === "yes" || v === "y" || v === "true") return true;
  if (v === "no" || v === "n" || v === "false") return false;
  return null;
}

const poImportRowSchema = z.object({
  number: z.string().min(1),
  jobType: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  salesperson: z.string().optional().nullable(),
  gcName: z.string().optional().nullable(),
  billedPercent: z.string().optional().nullable(),
  amount: z.string().optional().nullable(),
  amountDue: z.string().optional().nullable(),
  dueAt: z.string().optional().nullable(),
  permitNumber: z.string().optional().nullable(),
  permitJurisdiction: z.string().optional().nullable(),
  permitStatus: z.string().optional().nullable(),
  permitExpDate: z.string().optional().nullable(),
  nocRequired: z.string().optional().nullable(),
  installDate: z.string().optional().nullable(),
  startupDate: z.string().optional().nullable(),
  inspectionStatus: z.string().optional().nullable(),
  inspectionScheduledDate: z.string().optional().nullable(),
  extendedWarranty: z.string().optional().nullable(),
  registeredDate: z.string().optional().nullable(),
  redYellowTag: z.string().optional().nullable(),
  reinspection: z.string().optional().nullable(),
  rma: z.string().optional().nullable(),
  nto: z.string().optional().nullable(),
  firstDayOnJob: z.string().optional().nullable(),
  lastDayOnJob: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const purchaseOrdersRouter = createTRPCRouter({
  create: dispatcherProcedure
    .input(z.object({
      number: z.string().min(1),
      description: z.string().optional().nullable(),
      customerId: z.string().optional().nullable(),
      dueAt: z.string().optional().nullable(),
      amount: z.coerce.number().optional().nullable(),
      notes: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.purchaseOrder.findFirst({
        where: { companyId: ctx.companyId!, number: input.number },
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: `PO number "${input.number}" already exists` });

      let dueAt: Date | null = null;
      if (input.dueAt) {
        const d = new Date(input.dueAt);
        if (!isNaN(d.getTime())) dueAt = d;
      }

      return ctx.db.purchaseOrder.create({
        data: {
          companyId: ctx.companyId!,
          number: input.number,
          description: input.description ?? null,
          notes: input.notes ?? null,
          customerId: input.customerId ?? null,
          dueAt,
          amount: input.amount ?? null,
          status: "OPEN",
        },
      });
    }),

  get: dispatcherProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.id, companyId: ctx.companyId! },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          assignments: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, color: true, title: true, jobType: true } },
              assignedBy: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { assignedAt: "asc" },
          },
          noteHistory: {
            include: {
              author: { select: { id: true, firstName: true, lastName: true, color: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          timeEntries: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, color: true } },
              costCode: { select: { code: true, description: true } },
            },
            orderBy: { clockInAt: "desc" },
            take: 50,
          },
          _count: { select: { timeEntries: true } },
        },
      });
      if (!po) throw new TRPCError({ code: "NOT_FOUND" });
      return po;
    }),

  list: dispatcherProcedure
    .input(z.object({
      status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETE", "CANCELLED"]).optional(),
      jobType: z.enum(["RESIDENTIAL", "COMMERCIAL"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.purchaseOrder.findMany({
        where: {
          companyId: ctx.companyId!,
          ...(input?.status ? { status: input.status } : {}),
          ...(input?.jobType ? { jobType: input.jobType } : {}),
        },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          assignments: {
            include: { user: { select: { id: true, firstName: true, lastName: true, color: true } } },
          },
          _count: { select: { timeEntries: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  update: dispatcherProcedure
    .input(z.object({
      id: z.string().min(1),
      number: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      customerId: z.string().optional().nullable(),
      dueAt: z.string().optional().nullable(),
      amount: z.coerce.number().optional().nullable(),
      amountSpent: z.coerce.number().optional().nullable(),
      notes: z.string().optional().nullable(),
      issuedAt: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.id, companyId: ctx.companyId! },
      });
      if (!po) throw new TRPCError({ code: "NOT_FOUND" });

      if (input.number && input.number !== po.number) {
        const clash = await ctx.db.purchaseOrder.findFirst({
          where: { companyId: ctx.companyId!, number: input.number, id: { not: input.id } },
        });
        if (clash) throw new TRPCError({ code: "CONFLICT", message: `PO number "${input.number}" already exists` });
      }

      const parseDate = (s: string | null | undefined) => {
        if (!s) return null;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      };

      return ctx.db.purchaseOrder.update({
        where: { id: input.id },
        data: {
          ...(input.number !== undefined ? { number: input.number } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
          ...(input.dueAt !== undefined ? { dueAt: parseDate(input.dueAt) } : {}),
          ...(input.issuedAt !== undefined ? { issuedAt: parseDate(input.issuedAt) } : {}),
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.amountSpent !== undefined ? { amountSpent: input.amountSpent } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
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

      if (input.status === "COMPLETE" && !CLOSEABLE_FINANCIAL.includes(po.financialStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot complete a PO with financial status "${po.financialStatus}". Mark payment as Paid or Void first.`,
        });
      }

      if (input.status === "CANCELLED" && !CANCELLABLE_FINANCIAL.includes(po.financialStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel a PO with financial status "${po.financialStatus}". Resolve the outstanding balance first.`,
        });
      }

      return ctx.db.purchaseOrder.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  updateFinancialStatus: dispatcherProcedure
    .input(z.object({
      id: z.string().min(1),
      financialStatus: z.enum(["UNPAID", "INVOICED", "PARTIALLY_PAID", "PAID", "VOID"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.id, companyId: ctx.companyId! },
      });
      if (!po) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.purchaseOrder.update({
        where: { id: input.id },
        data: { financialStatus: input.financialStatus },
      });
    }),

  addAssignment: dispatcherProcedure
    .input(z.object({
      purchaseOrderId: z.string().min(1),
      userId: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.purchaseOrderId, companyId: ctx.companyId! },
      });
      if (!po) throw new TRPCError({ code: "NOT_FOUND" });

      const user = await ctx.db.user.findFirst({
        where: { id: input.userId, companyId: ctx.companyId! },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      return ctx.db.purchaseOrderAssignment.upsert({
        where: { purchaseOrderId_userId: { purchaseOrderId: input.purchaseOrderId, userId: input.userId } },
        update: {},
        create: {
          purchaseOrderId: input.purchaseOrderId,
          userId: input.userId,
          assignedById: ctx.session.user.id,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, color: true, title: true, jobType: true } },
        },
      });
    }),

  removeAssignment: dispatcherProcedure
    .input(z.object({
      purchaseOrderId: z.string().min(1),
      userId: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.purchaseOrderId, companyId: ctx.companyId! },
      });
      if (!po) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.purchaseOrderAssignment.deleteMany({
        where: { purchaseOrderId: input.purchaseOrderId, userId: input.userId },
      });
      return { ok: true };
    }),

  addNote: dispatcherProcedure
    .input(z.object({
      purchaseOrderId: z.string().min(1),
      content: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const po = await ctx.db.purchaseOrder.findFirst({
        where: { id: input.purchaseOrderId, companyId: ctx.companyId! },
      });
      if (!po) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.purchaseOrderNote.create({
        data: {
          purchaseOrderId: input.purchaseOrderId,
          authorId: ctx.session.user.id,
          content: input.content,
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, color: true } },
        },
      });
    }),

  deleteNote: dispatcherProcedure
    .input(z.object({ noteId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.purchaseOrderNote.findFirst({
        where: { id: input.noteId },
        include: { purchaseOrder: { select: { companyId: true } } },
      });
      if (!note || note.purchaseOrder.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.purchaseOrderNote.delete({ where: { id: input.noteId } });
      return { ok: true };
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

          await ctx.db.purchaseOrder.create({
            data: {
              companyId: ctx.companyId!,
              number: row.number,
              jobType: row.jobType ?? null,
              description: row.description ?? null,
              customerName: row.customerName ?? null,
              address: row.address ?? null,
              salesperson: row.salesperson ?? null,
              gcName: row.gcName ?? null,
              billedPercent: row.billedPercent ?? null,
              amount: parseCurrency(row.amount),
              amountDue: parseCurrency(row.amountDue),
              dueAt: parseDate(row.dueAt),
              permitNumber: row.permitNumber ?? null,
              permitJurisdiction: row.permitJurisdiction ?? null,
              permitStatus: row.permitStatus ?? null,
              permitExpDate: parseDate(row.permitExpDate),
              nocRequired: parseBool(row.nocRequired),
              installDate: parseDate(row.installDate),
              startupDate: parseDate(row.startupDate),
              inspectionStatus: row.inspectionStatus ?? null,
              inspectionScheduledDate: parseDate(row.inspectionScheduledDate),
              extendedWarranty: parseBool(row.extendedWarranty),
              registeredDate: parseDate(row.registeredDate),
              redYellowTag: row.redYellowTag ?? null,
              reinspection: parseBool(row.reinspection),
              rma: row.rma ?? null,
              nto: row.nto ?? null,
              firstDayOnJob: parseDate(row.firstDayOnJob),
              lastDayOnJob: parseDate(row.lastDayOnJob),
              notes: row.notes ?? null,
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
