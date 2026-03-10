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

export const athleteClaimLinkStatusSchema = z.enum(["pending", "claimed", "revoked", "expired"]);

export const createAthleteClaimLinkInputSchema = z.object({
  email: z.string().trim().email()
});

export const athleteClaimLinkSchema = z.object({
  id: z.string().uuid(),
  athleteId: z.string().uuid(),
  athleteName: z.string(),
  email: z.string().email(),
  status: athleteClaimLinkStatusSchema,
  claimUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime()
});

export const athleteClaimDetailsSchema = z.object({
  token: z.string(),
  athleteId: z.string().uuid(),
  athleteName: z.string(),
  email: z.string().email(),
  tenantId: z.string().uuid(),
  tenantName: z.string(),
  tenantSlug: z.string(),
  currentSquad: athleteSchema.shape.currentSquad,
  expiresAt: z.string().datetime()
});

export const athletePortalSchema = z.object({
  athlete: athleteSchema,
  latestSnapshot: z.object({
    readinessBand: z.enum(["ready", "caution", "restricted"]).nullable(),
    readinessScore: z.number().int().min(0).max(100).nullable(),
    recommendation: z.enum(["full_load", "reduced_load", "monitor", "recovery_focus"]).nullable(),
    snapshotDate: z.string().date().nullable(),
    rationale: z.array(z.string())
  }),
  garminConnected: z.boolean()
});

export const createAthleteResponseSchema = athleteSchema;

export type ListAthletesQuery = z.infer<typeof listAthletesQuerySchema>;
export type CreateAthleteInput = z.infer<typeof createAthleteInputSchema>;
export type UpdateAthleteSquadInput = z.infer<typeof updateAthleteSquadInputSchema>;
export type CreateAthleteClaimLinkInput = z.infer<typeof createAthleteClaimLinkInputSchema>;
export type AthleteClaimLink = z.infer<typeof athleteClaimLinkSchema>;
export type AthleteClaimDetails = z.infer<typeof athleteClaimDetailsSchema>;
export type AthletePortal = z.infer<typeof athletePortalSchema>;
