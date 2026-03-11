import type { AthleteAccountDetails, AthleteAccountState } from "@pulsi/shared";

export interface AthleteRosterStateRow {
  athleteAccountClaimedAt: Date | null;
  athleteAccountEmail: string | null;
  athleteAccountName: string | null;
  athleteAccountUserId: string | null;
  pendingClaimEmail: string | null;
  pendingClaimExpiresAt: Date | null;
  pendingClaimLinkId: string | null;
}

export const deriveAthleteAccountState = (row: AthleteRosterStateRow): AthleteAccountState => {
  // Historical athlete-account linkage must win over pending invites so roster
  // views continue to reflect that the athlete has already claimed a Pulsi
  // account, even after archive revokes active login access.
  if (row.athleteAccountUserId) {
    return "claimed";
  }

  if (row.pendingClaimLinkId) {
    return "invited";
  }

  return "unclaimed";
};

export const buildAthleteAccountDetails = (
  row: AthleteRosterStateRow
): AthleteAccountDetails | null => {
  if (!row.athleteAccountUserId && !row.pendingClaimLinkId) {
    return null;
  }

  return {
    userId: row.athleteAccountUserId,
    name: row.athleteAccountName,
    email: row.athleteAccountEmail,
    claimedAt: row.athleteAccountClaimedAt?.toISOString() ?? null,
    pendingEmail: row.pendingClaimEmail,
    pendingExpiresAt: row.pendingClaimExpiresAt?.toISOString() ?? null
  };
};
