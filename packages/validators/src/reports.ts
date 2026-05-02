import { z } from "zod";

export const laborReportSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  userId: z.string().min(1).optional(),
  costCodeId: z.string().min(1).optional(),
});

export const timecardExportSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(["APPROVED", "PENDING"]).default("APPROVED"),
  format: z.enum(["csv", "qb_iif"]).default("csv"),
});

export type LaborReportInput = z.infer<typeof laborReportSchema>;
export type TimecardExportInput = z.infer<typeof timecardExportSchema>;
