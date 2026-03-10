import { z } from "zod";

export const garminTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().int().positive(),
  token_type: z.string(),
  refresh_token: z.string(),
  scope: z.string(),
  jti: z.string().optional(),
  refresh_token_expires_in: z.number().int().positive()
});

export const garminUserIdResponseSchema = z.object({
  userId: z.string().min(1)
});

export const garminPermissionsResponseSchema = z.array(z.string());

export const garminDeregistrationWebhookSchema = z.object({
  deregistrations: z.array(
    z.object({
      userId: z.string().min(1)
    })
  )
});

export const garminUserPermissionsWebhookSchema = z.object({
  userPermissionsChange: z.array(
    z.object({
      userId: z.string().min(1),
      summaryId: z.string().optional(),
      permissions: z.array(z.string()),
      changeTimeInSeconds: z.number().int().nonnegative()
    })
  )
});

export type GarminTokenResponse = z.infer<typeof garminTokenResponseSchema>;
