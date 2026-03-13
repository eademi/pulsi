import type { AuthenticatedActor } from "../context/app-context";
import { env } from "../env";
import { AppError } from "../http/errors";

const configuredAdminEmails = env.PULSI_ADMIN_EMAILS.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const isPlatformAdminEmail = (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (configuredAdminEmails.includes(normalizedEmail)) {
    return true;
  }

  return env.NODE_ENV !== "production" && normalizedEmail.endsWith("@pulsi.com");
};

export const requirePlatformAdmin = (actor: AuthenticatedActor) => {
  if (!isPlatformAdminEmail(actor.email) || actor.actorType !== "staff") {
    throw new AppError(403, "FORBIDDEN", "Pulsi administrator access is required");
  }
};
