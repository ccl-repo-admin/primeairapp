import { z } from "zod";
import { createTRPCRouter, protectedProcedure, dispatcherProcedure } from "../trpc";
import { locationPingSchema } from "@primeair/validators";
import { TRPCError } from "@trpc/server";

export const locationsRouter = createTRPCRouter({
  savePing: protectedProcedure
    .input(locationPingSchema)
    .mutation(async ({ ctx, input }) => {
      const activeEntry = await ctx.db.timeEntry.findFirst({
        where: { userId: ctx.userId, companyId: ctx.companyId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!activeEntry) {
        throw new TRPCError({ code: "FORBIDDEN", message: "GPS only tracked while clocked in" });
      }

      return ctx.db.locationPing.create({
        data: {
          userId: ctx.userId!,
          companyId: ctx.companyId!,
          lat: input.lat,
          lng: input.lng,
          accuracy: input.accuracy ?? null,
          speed: input.speed ?? null,
          bearing: input.bearing ?? null,
          altitude: input.altitude ?? null,
          isDriving: input.isDriving,
          timestamp: input.timestamp,
        },
      });
    }),

  getTrail: dispatcherProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.locationPing.findMany({
        where: {
          companyId: ctx.companyId,
          userId: input.userId,
          timestamp: { gte: input.startDate, lte: input.endDate },
        },
        orderBy: { timestamp: "asc" },
        select: {
          lat: true,
          lng: true,
          speed: true,
          isDriving: true,
          timestamp: true,
        },
      });
    }),

  getActivePings: dispatcherProcedure.query(async ({ ctx }) => {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return ctx.db.locationPing.findMany({
      where: {
        companyId: ctx.companyId,
        timestamp: { gte: fifteenMinutesAgo },
      },
      orderBy: { timestamp: "desc" },
      distinct: ["userId"],
      include: {
        user: { select: { id: true, firstName: true, lastName: true, color: true } },
      },
    });
  }),
});
