import { z } from "zod";

export const createCostCodeSchema = z.object({
  code: z.string().min(1).max(20).regex(/^[A-Z0-9\-_]+$/i, "Letters, numbers, dashes, underscores only"),
  description: z.string().max(200).optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
});

export const updateCostCodeSchema = createCostCodeSchema.partial();

export type CreateCostCodeInput = z.infer<typeof createCostCodeSchema>;
