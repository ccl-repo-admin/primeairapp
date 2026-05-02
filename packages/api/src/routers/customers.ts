import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  dispatcherProcedure,
} from "../trpc";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema,
  createServiceAddressSchema,
} from "@primeair/validators";

export const customersRouter = createTRPCRouter({
  list: dispatcherProcedure.input(listCustomersSchema).query(async ({ ctx, input }) => {
    return ctx.db.customer.findMany({
      where: {
        companyId: ctx.companyId,
        ...(input.search && {
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" } },
            { lastName: { contains: input.search, mode: "insensitive" } },
            { companyName: { contains: input.search, mode: "insensitive" } },
            { email: { contains: input.search, mode: "insensitive" } },
            { phone: { contains: input.search } },
          ],
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { workOrders: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: input.limit,
      skip: input.offset,
    });
  }),

  getById: dispatcherProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          addresses: { orderBy: { id: "asc" } },
          assets: { orderBy: { createdAt: "desc" } },
          workOrders: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true, number: true, type: true, status: true,
              description: true, scheduledStart: true, createdAt: true,
            },
          },
        },
      });
      if (!customer) throw new TRPCError({ code: "NOT_FOUND" });
      return customer;
    }),

  create: dispatcherProcedure.input(createCustomerSchema).mutation(async ({ ctx, input }) => {
    if (input.email) {
      const exists = await ctx.db.customer.findFirst({
        where: { companyId: ctx.companyId, email: input.email.toLowerCase() },
      });
      if (exists) throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
    }

    return ctx.db.customer.create({
      data: {
        companyId: ctx.companyId!,
        firstName: input.firstName,
        lastName: input.lastName ?? null,
        companyName: input.companyName ?? null,
        email: input.email?.toLowerCase() ?? null,
        phone: input.phone ?? null,
        altPhone: input.altPhone ?? null,
        notes: input.notes ?? null,
        ...(input.line1 && {
          addresses: {
            create: [{
              label: "Primary",
              line1: input.line1,
              line2: input.line2 ?? null,
              city: input.city ?? "",
              state: input.state ?? "",
              zip: input.zip ?? "",
              isPrimary: true,
            }],
          },
        }),
      },
    });
  }),

  update: dispatcherProcedure
    .input(z.object({ id: z.string().min(1) }).merge(updateCustomerSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const customer = await ctx.db.customer.findFirst({ where: { id, companyId: ctx.companyId } });
      if (!customer) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.customer.update({
        where: { id },
        data: {
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.lastName !== undefined && { lastName: data.lastName }),
          ...(data.companyName !== undefined && { companyName: data.companyName }),
          ...(data.email !== undefined && { email: data.email?.toLowerCase() ?? null }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.altPhone !== undefined && { altPhone: data.altPhone }),
          ...(data.notes !== undefined && { notes: data.notes }),
        },
      });
    }),

  addServiceAddress: dispatcherProcedure
    .input(createServiceAddressSchema)
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.findFirst({
        where: { id: input.customerId, companyId: ctx.companyId },
      });
      if (!customer) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.serviceAddress.create({
        data: {
          customerId: input.customerId,
          label: input.label ?? null,
          line1: input.line1,
          line2: input.line2 ?? null,
          city: input.city,
          state: input.state,
          zip: input.zip,
        },
      });
    }),
});
