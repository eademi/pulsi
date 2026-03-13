import type { AthleteActorProfile } from "@pulsi/shared";

import type {
  AuthenticatedActor,
  StaffAuthenticatedActor,
  TenantMembershipRecord
} from "../context/app-context";
import type { NormalizedSession } from "./auth";
import { AppError } from "../http/errors";

interface ResolveAuthenticatedActorInput {
  session: NormalizedSession;
  memberships: TenantMembershipRecord[];
  athleteProfile: AthleteActorProfile | null;
}

export const resolveAuthenticatedActor = ({
  session,
  memberships,
  athleteProfile
}: ResolveAuthenticatedActorInput): AuthenticatedActor => {
  // A Pulsi account should resolve to exactly one actor mode. If a user ends up
  // both as staff and as a linked athlete account, fail fast rather than
  // silently picking one access model and leaking the other.
  if (memberships.length > 0 && athleteProfile) {
    throw new AppError(
      409,
      "CONFLICT",
      "This account is linked to both staff and athlete access. Resolve the duplicate assignment before signing in."
    );
  }

  if (athleteProfile) {
    return {
      actorType: "athlete",
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      sessionId: session.session.id,
      sessionExpiresAt: session.session.expiresAt,
      memberships: [],
      athleteProfile
    };
  }

  const staffActor: StaffAuthenticatedActor = {
    actorType: "staff",
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    sessionId: session.session.id,
    sessionExpiresAt: session.session.expiresAt,
    memberships,
    athleteProfile: null
  };

  return staffActor;
};
