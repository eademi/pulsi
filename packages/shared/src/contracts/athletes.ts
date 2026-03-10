import { z } from "zod";

import { athleteSchema, athleteStatusSchema } from "./readiness";

export { athleteStatusSchema };

export const listAthletesQuerySchema = z.object({
  squadId: z.string().uuid().optional(),
  squadSlug: z.string().min(1).max(64).optional()
});

export const createAthleteInputSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  externalRef: z.string().trim().min(1).max(120).nullable().optional(),
  position: z.string().trim().min(1).max(80).nullable().optional(),
  squadId: z.string().uuid(),
  status: athleteStatusSchema.default("active")
});

export const updateAthleteSquadInputSchema = z.object({
  squadId: z.string().uuid()
});

export const createAthleteResponseSchema = athleteSchema;

export type ListAthletesQuery = z.infer<typeof listAthletesQuerySchema>;
export type CreateAthleteInput = z.infer<typeof createAthleteInputSchema>;
export type UpdateAthleteSquadInput = z.infer<typeof updateAthleteSquadInputSchema>;
