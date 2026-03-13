import type { AthleteAccountDetails, AthleteAccountState } from "@pulsi/shared";

export interface AthleteRosterStateRow {
  athleteAccountLinkedAt: Date | null;
  athleteAccountEmail: string | null;
  athleteAccountName: string | null;
  athleteAccountUserId: string | null;
  pendingInviteEmail: string | null;
  pendingInviteExpiresAt: Date | null;
  pendingInviteId: string | null;
}

export const deriveAthleteAccountState = (row: AthleteRosterStateRow): AthleteAccountState => {
  // Historical athlete-account linkage must win over pending invites so roster
  // views continue to reflect that the athlete already linked a Pulsi
  // account, even after archive revokes active login access.
  if (row.athleteAccountUserId) {
    return "linked";
  }

  if (row.pendingInviteId) {
    return "invited";
  }

  return "unlinked";
};

export const buildAthleteAccountDetails = (
  row: AthleteRosterStateRow
): AthleteAccountDetails | null => {
  if (!row.athleteAccountUserId && !row.pendingInviteId) {
    return null;
  }

  return {
    userId: row.athleteAccountUserId,
    name: row.athleteAccountName,
    email: row.athleteAccountEmail,
    linkedAt: row.athleteAccountLinkedAt?.toISOString() ?? null,
    pendingEmail: row.pendingInviteEmail,
    pendingExpiresAt: row.pendingInviteExpiresAt?.toISOString() ?? null
  };
};
