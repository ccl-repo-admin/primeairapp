import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { WorkOrderStatus, WorkOrderType, Priority, PhotoType, NoteVisibility, PartRequestStatus, PartRequestUrgency } from "@primeair/db";
import {
  createTRPCRouter,
  protectedProcedure,
  dispatcherProcedure,
} from "../trpc";
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  updateWorkOrderStatusSchema,
  assignWorkOrderSchema,
  listWorkOrdersSchema,
} from "@primeair/validators";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NEW: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["DISPATCHED", "NEW", "CANCELLED"],
  DISPATCHED: ["EN_ROUTE", "SCHEDULED", "CANCELLED"],
  EN_ROUTE: ["IN_PROGRESS", "DISPATCHED"],
  IN_PROGRESS: ["COMPLETE", "ON_HOLD", "EN_ROUTE"],
  ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
  COMPLETE: ["INVOICED", "IN_PROGRESS"],
  INVOICED: ["PAID", "COMPLETE"],
  PAID: ["CANCELLED"],
  CANCELLED: ["NEW"],
};

// Transitions a field tech is allowed to make on jobs they're assigned to
const TECH_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["EN_ROUTE"],
  DISPATCHED: ["EN_ROUTE"],
  EN_ROUTE: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETE", "ON_HOLD"],
  ON_HOLD: ["IN_PROGRESS"],
};

const fullWoInclude = {
  customer: true,
  serviceAddress: true,
  asset: true,
  assignments: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, color: true } },
    },
  },
  timeEntries: {
    select: {
      id: true, clockInAt: true, clockOutAt: true, totalMinutes: true, status: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { clockInAt: "desc" as const },
    take: 30,
  },
  statusHistory: { orderBy: { changedAt: "desc" as const }, take: 30 },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  photos: {
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  notes: {
    include: {
      author: { select: { id: true, firstName: true, lastName: true, color: true } },
    },
    orderBy: [{ isPinned: "desc" as const }, { createdAt: "desc" as const }],
  },
  partRequests: {
    include: {
      requestedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
  partUsages: {
    include: {
      part: { select: { id: true, name: true, sku: true, unit: true } },
    },
    orderBy: { usedAt: "asc" as const },
  },
  checklists: {
    include: {
      items: { orderBy: { sortOrder: "asc" as const } },
    },
  },
};

export const workOrdersRouter = createTRPCRouter({
  list: dispatcherProcedure.input(listWorkOrdersSchema).query(async ({ ctx, input }) => {
    return ctx.db.workOrder.findMany({
      where: {
        companyId: ctx.companyId,
        ...(input.status && { status: input.status as WorkOrderStatus }),
        ...(input.customerId && { customerId: input.customerId }),
        ...(input.type && { type: input.type as WorkOrderType }),
        ...(input.priority && { priority: input.priority as Priority }),
        ...(input.assignedUserId && {
          assignments: { some: { userId: input.assignedUserId, isActive: true } },
        }),
        ...(input.startDate && input.endDate && {
          scheduledStart: { gte: input.startDate, lte: input.endDate },
        }),
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        serviceAddress: { select: { id: true, line1: true, city: true, state: true } },
        assignments: {
          where: { isActive: true },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, color: true } },
          },
        },
        _count: { select: { photos: true, notes: true, partRequests: true } },
      },
      orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
      take: input.limit,
      skip: input.offset,
    });
  }),

  myJobs: protectedProcedure
    .input(z.object({ date: z.coerce.date().optional() }))
    .query(async ({ ctx, input }) => {
      const d = input.date ?? new Date();
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      return ctx.db.workOrder.findMany({
        where: {
          companyId: ctx.companyId,
          status: { in: ["SCHEDULED", "DISPATCHED", "EN_ROUTE", "IN_PROGRESS", "ON_HOLD"] },
          assignments: { some: { userId: ctx.userId, isActive: true } },
          OR: [
            { scheduledStart: { gte: startOfDay, lte: endOfDay } },
            { scheduledStart: null },
          ],
        },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, companyName: true, phone: true },
          },
          serviceAddress: true,
          asset: { select: { id: true, make: true, model: true, serialNumber: true, type: true } },
          _count: { select: { photos: true, partRequests: true } },
        },
        orderBy: { scheduledStart: "asc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const wo = await ctx.db.workOrder.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: fullWoInclude,
      });
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });
      return wo;
    }),

  create: dispatcherProcedure.input(createWorkOrderSchema).mutation(async ({ ctx, input }) => {
    const customer = await ctx.db.customer.findFirst({
      where: { id: input.customerId, companyId: ctx.companyId },
    });
    if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });

    const last = await ctx.db.workOrder.findFirst({
      where: { companyId: ctx.companyId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const number = (last?.number ?? 0) + 1;

    return ctx.db.workOrder.create({
      data: {
        companyId: ctx.companyId!,
        number,
        customerId: input.customerId,
        serviceAddressId: input.serviceAddressId ?? null,
        assetId: input.assetId ?? null,
        type: (input.type ?? "REPAIR") as WorkOrderType,
        priority: (input.priority ?? "NORMAL") as Priority,
        status: "NEW",
        description: input.description ?? null,
        internalNotes: input.internalNotes ?? null,
        scheduledStart: input.scheduledStart ?? null,
        estimatedDuration: input.estimatedDuration ?? null,
        createdByUserId: ctx.userId!,
      },
    });
  }),

  update: dispatcherProcedure
    .input(z.object({ id: z.string().min(1) }).merge(updateWorkOrderSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const wo = await ctx.db.workOrder.findFirst({ where: { id, companyId: ctx.companyId } });
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.workOrder.update({
        where: { id },
        data: {
          ...(data.description !== undefined && { description: data.description }),
          ...(data.internalNotes !== undefined && { internalNotes: data.internalNotes }),
          ...(data.priority && { priority: data.priority as Priority }),
          ...(data.scheduledStart !== undefined && { scheduledStart: data.scheduledStart }),
          ...(data.estimatedDuration !== undefined && { estimatedDuration: data.estimatedDuration }),
          ...(data.serviceAddressId !== undefined && { serviceAddressId: data.serviceAddressId ?? null }),
          ...(data.assetId !== undefined && { assetId: data.assetId ?? null }),
        },
      });
    }),

  updateStatus: protectedProcedure
    .input(updateWorkOrderStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const isDispatcher = !!ctx.permissions?.canApproveTimecards;

      const wo = await ctx.db.workOrder.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: isDispatcher
          ? undefined
          : { assignments: { where: { userId: ctx.userId!, isActive: true }, select: { id: true } } },
      });
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });

      if (!isDispatcher) {
        // Tech must be assigned to this job
        const assigned = (wo as typeof wo & { assignments?: { id: string }[] }).assignments;
        if (!assigned || assigned.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this job" });
        }
        // Tech can only make field-level transitions
        const techAllowed = TECH_TRANSITIONS[wo.status] ?? [];
        if (!techAllowed.includes(input.status)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Field techs cannot transition from ${wo.status} to ${input.status}`,
          });
        }
      }

      const allowed = ALLOWED_TRANSITIONS[wo.status] ?? [];
      if (!allowed.includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from ${wo.status} to ${input.status}`,
        });
      }

      const newStatus = input.status as WorkOrderStatus;
      const [updated] = await ctx.db.$transaction([
        ctx.db.workOrder.update({
          where: { id: input.id },
          data: {
            status: newStatus,
            ...(newStatus === "COMPLETE" && { completedAt: new Date() }),
          },
        }),
        ctx.db.workOrderStatusHistory.create({
          data: {
            workOrderId: input.id,
            changedById: ctx.userId!,
            fromStatus: wo.status,
            toStatus: newStatus,
            note: input.note ?? null,
          },
        }),
      ]);

      return updated;
    }),

  assign: dispatcherProcedure.input(assignWorkOrderSchema).mutation(async ({ ctx, input }) => {
    const wo = await ctx.db.workOrder.findFirst({
      where: { id: input.workOrderId, companyId: ctx.companyId },
    });
    if (!wo) throw new TRPCError({ code: "NOT_FOUND" });

    const users = await ctx.db.user.findMany({
      where: { id: { in: input.userIds }, companyId: ctx.companyId, isActive: true },
    });
    if (users.length !== input.userIds.length) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "One or more users not found" });
    }

    await ctx.db.$transaction(
      input.userIds.map((userId, idx) =>
        ctx.db.workOrderAssignment.upsert({
          where: { workOrderId_userId: { workOrderId: input.workOrderId, userId } },
          create: { workOrderId: input.workOrderId, userId, isLead: input.isLead && idx === 0, isActive: true },
          update: { isActive: true, isLead: input.isLead && idx === 0 },
        })
      )
    );

    return { assigned: users.length };
  }),

  unassign: dispatcherProcedure
    .input(z.object({ workOrderId: z.string().min(1), userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const wo = await ctx.db.workOrder.findFirst({
        where: { id: input.workOrderId, companyId: ctx.companyId },
      });
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.workOrderAssignment.updateMany({
        where: { workOrderId: input.workOrderId, userId: input.userId },
        data: { isActive: false },
      });
    }),

  // ─── PHOTOS ─────────────────────────────────────────────────────────────────

  addPhoto: protectedProcedure
    .input(z.object({
      workOrderId: z.string().min(1),
      url: z.string().min(1),
      caption: z.string().max(200).optional(),
      photoType: z.enum(["BEFORE", "AFTER", "EQUIPMENT", "DAMAGE", "PERMIT", "OTHER"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const wo = await ctx.db.workOrder.findFirst({ where: { id: input.workOrderId, companyId: ctx.companyId } });
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.workOrderPhoto.create({
        data: {
          workOrderId: input.workOrderId,
          uploadedById: ctx.userId!,
          url: input.url,
          caption: input.caption ?? null,
          photoType: (input.photoType ?? "OTHER") as PhotoType,
        },
        include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
      });
    }),

  deletePhoto: protectedProcedure
    .input(z.object({ photoId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const photo = await ctx.db.workOrderPhoto.findFirst({
        where: { id: input.photoId },
        include: { workOrder: { select: { companyId: true } } },
      });
      if (!photo || photo.workOrder.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      // Only uploader or dispatcher+ can delete
      if (photo.uploadedById !== ctx.userId) {
        const user = await ctx.db.user.findFirst({
          where: { id: ctx.userId!, companyId: ctx.companyId },
          include: { role: true },
        });
        if (!user?.role?.canAssignWorkOrders) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      await ctx.db.workOrderPhoto.delete({ where: { id: input.photoId } });
      return { deleted: true };
    }),

  // ─── NOTES ──────────────────────────────────────────────────────────────────

  addNote: protectedProcedure
    .input(z.object({
      workOrderId: z.string().min(1),
      body: z.string().min(1).max(2000),
      visibility: z.enum(["INTERNAL", "FIELD", "CUSTOMER"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const wo = await ctx.db.workOrder.findFirst({ where: { id: input.workOrderId, companyId: ctx.companyId } });
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.workOrderNote.create({
        data: {
          workOrderId: input.workOrderId,
          authorId: ctx.userId!,
          body: input.body,
          visibility: (input.visibility ?? "INTERNAL") as NoteVisibility,
        },
        include: { author: { select: { id: true, firstName: true, lastName: true, color: true } } },
      });
    }),

  editNote: protectedProcedure
    .input(z.object({ noteId: z.string().min(1), body: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.workOrderNote.findFirst({
        where: { id: input.noteId },
        include: { workOrder: { select: { companyId: true } } },
      });
      if (!note || note.workOrder.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (note.authorId !== ctx.userId) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.db.workOrderNote.update({
        where: { id: input.noteId },
        data: { body: input.body, editedAt: new Date() },
        include: { author: { select: { id: true, firstName: true, lastName: true, color: true } } },
      });
    }),

  pinNote: dispatcherProcedure
    .input(z.object({ noteId: z.string().min(1), isPinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.workOrderNote.findFirst({
        where: { id: input.noteId },
        include: { workOrder: { select: { companyId: true } } },
      });
      if (!note || note.workOrder.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.workOrderNote.update({
        where: { id: input.noteId },
        data: { isPinned: input.isPinned },
      });
    }),

  deleteNote: protectedProcedure
    .input(z.object({ noteId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.workOrderNote.findFirst({
        where: { id: input.noteId },
        include: { workOrder: { select: { companyId: true } } },
      });
      if (!note || note.workOrder.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (note.authorId !== ctx.userId) {
        const user = await ctx.db.user.findFirst({
          where: { id: ctx.userId!, companyId: ctx.companyId },
          include: { role: true },
        });
        if (!user?.role?.canAssignWorkOrders) throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.workOrderNote.delete({ where: { id: input.noteId } });
      return { deleted: true };
    }),

  // ─── PART REQUESTS ─────────────────────────────────────────────────────────

  addPartRequest: protectedProcedure
    .input(z.object({
      workOrderId: z.string().min(1),
      name: z.string().min(1).max(200),
      partNumber: z.string().max(100).optional(),
      quantity: z.number().int().min(1).max(9999).optional(),
      urgency: z.enum(["STANDARD", "URGENT"]).optional(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const wo = await ctx.db.workOrder.findFirst({ where: { id: input.workOrderId, companyId: ctx.companyId } });
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.workOrderPartRequest.create({
        data: {
          workOrderId: input.workOrderId,
          requestedById: ctx.userId!,
          name: input.name,
          partNumber: input.partNumber ?? null,
          quantity: input.quantity ?? 1,
          urgency: (input.urgency ?? "STANDARD") as PartRequestUrgency,
          notes: input.notes ?? null,
        },
        include: { requestedBy: { select: { id: true, firstName: true, lastName: true } } },
      });
    }),

  updatePartRequest: dispatcherProcedure
    .input(z.object({
      id: z.string().min(1),
      status: z.enum(["REQUESTED", "ORDERED", "RECEIVED", "CANCELLED"]),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.db.workOrderPartRequest.findFirst({
        where: { id: input.id },
        include: { workOrder: { select: { companyId: true } } },
      });
      if (!req || req.workOrder.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const newStatus = input.status as PartRequestStatus;
      return ctx.db.workOrderPartRequest.update({
        where: { id: input.id },
        data: {
          status: newStatus,
          ...(newStatus === "ORDERED" && { orderedAt: new Date() }),
          ...(newStatus === "RECEIVED" && { receivedAt: new Date() }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });
    }),

  deletePartRequest: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.db.workOrderPartRequest.findFirst({
        where: { id: input.id },
        include: { workOrder: { select: { companyId: true } } },
      });
      if (!req || req.workOrder.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (req.requestedById !== ctx.userId) {
        const user = await ctx.db.user.findFirst({
          where: { id: ctx.userId!, companyId: ctx.companyId },
          include: { role: true },
        });
        if (!user?.role?.canAssignWorkOrders) throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.workOrderPartRequest.delete({ where: { id: input.id } });
      return { deleted: true };
    }),

  // ─── DIAGNOSTICS ─────────────────────────────────────────────────────────

  updateDiagnostics: protectedProcedure
    .input(z.object({
      workOrderId: z.string().min(1),
      diagnostics: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const wo = await ctx.db.workOrder.findFirst({ where: { id: input.workOrderId, companyId: ctx.companyId } });
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.workOrder.update({
        where: { id: input.workOrderId },
        data: { diagnostics: input.diagnostics },
        select: { id: true, diagnostics: true },
      });
    }),

  // ─── CHECKLISTS ──────────────────────────────────────────────────────────

  addChecklist: dispatcherProcedure
    .input(z.object({
      workOrderId: z.string().min(1),
      name: z.string().min(1).max(200),
      items: z.array(z.string().min(1).max(300)).min(1).max(50),
    }))
    .mutation(async ({ ctx, input }) => {
      const wo = await ctx.db.workOrder.findFirst({ where: { id: input.workOrderId, companyId: ctx.companyId } });
      if (!wo) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.checklist.create({
        data: {
          workOrderId: input.workOrderId,
          name: input.name,
          items: {
            create: input.items.map((text, i) => ({ text, sortOrder: i })),
          },
        },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
    }),

  addChecklistItem: dispatcherProcedure
    .input(z.object({
      checklistId: z.string().min(1),
      text: z.string().min(1).max(300),
    }))
    .mutation(async ({ ctx, input }) => {
      const checklist = await ctx.db.checklist.findFirst({
        where: { id: input.checklistId },
        include: { workOrder: { select: { companyId: true } }, items: { select: { sortOrder: true } } },
      });
      if (!checklist || checklist.workOrder.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const maxOrder = Math.max(0, ...checklist.items.map((i) => i.sortOrder));
      return ctx.db.checklistItem.create({
        data: { checklistId: input.checklistId, text: input.text, sortOrder: maxOrder + 1 },
      });
    }),

  toggleChecklistItem: protectedProcedure
    .input(z.object({ itemId: z.string().min(1), isComplete: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.checklistItem.findFirst({
        where: { id: input.itemId },
        include: { checklist: { include: { workOrder: { select: { companyId: true } } } } },
      });
      if (!item || item.checklist.workOrder.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.checklistItem.update({
        where: { id: input.itemId },
        data: {
          isComplete: input.isComplete,
          completedAt: input.isComplete ? new Date() : null,
          completedById: input.isComplete ? ctx.userId : null,
        },
      });
    }),

  deleteChecklistItem: dispatcherProcedure
    .input(z.object({ itemId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.checklistItem.findFirst({
        where: { id: input.itemId },
        include: { checklist: { include: { workOrder: { select: { companyId: true } } } } },
      });
      if (!item || item.checklist.workOrder.companyId !== ctx.companyId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db.checklistItem.delete({ where: { id: input.itemId } });
      return { deleted: true };
    }),
});
