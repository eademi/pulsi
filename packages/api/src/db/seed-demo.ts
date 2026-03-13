import { createHash } from "node:crypto";

import { and, eq, isNull, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

import { closeDatabase, db } from "./client";
import {
  account,
  athleteAccounts,
  athleteIntegrations,
  athleteInvites,
  athleteSquadAssignments,
  athletes,
  readinessSnapshots,
  squads,
  staffMemberships,
  tenants,
  tenantUserSquadAccess,
  user,
  wearableDailyMetrics
} from "./schema";

const DEMO_PASSWORD = "PulsiDemo123!";
const DEMO_TIMEZONE = "Europe/Berlin";
const TODAY = new Date("2026-03-10T08:00:00.000Z");
const DEMO_TENANT = {
  slug: "pulsi-demo-fc",
  name: "Pulsi Demo FC",
  timezone: DEMO_TIMEZONE
};

const STAFF_FIXTURES = [
  {
    key: "owner",
    email: "owner@pulsi.com",
    name: "Olivia Owner",
    role: "club_owner" as const,
    accessScope: "all_squads" as const,
    squadSlugs: [] as string[]
  },
  {
    key: "admin",
    email: "admin@pulsi.com",
    name: "Ari Admin",
    role: "org_admin" as const,
    accessScope: "all_squads" as const,
    squadSlugs: [] as string[]
  },
  {
    key: "coach-senior",
    email: "coach.senior@pulsi.com",
    name: "Sara Senior Coach",
    role: "coach" as const,
    accessScope: "assigned_squads" as const,
    squadSlugs: ["senior"]
  },
  {
    key: "performance",
    email: "performance@pulsi.com",
    name: "Pavel Performance",
    role: "performance_staff" as const,
    accessScope: "all_squads" as const,
    squadSlugs: [] as string[]
  },
  {
    key: "analyst-u18",
    email: "analyst.u18@pulsi.com",
    name: "Anya Analyst",
    role: "analyst" as const,
    accessScope: "assigned_squads" as const,
    squadSlugs: ["u18"]
  }
];

const SQUAD_FIXTURES = [
  { slug: "senior", name: "Senior", category: "First team" },
  { slug: "u18", name: "U18", category: "Academy" }
] as const;

const CLAIMED_ATHLETE_EMAILS = new Map<string, string>([
  ["senior-01", "senior.01@pulsi.com"],
  ["senior-02", "senior.02@pulsi.com"],
  ["u18-01", "u18.01@pulsi.com"],
  ["u18-02", "u18.02@pulsi.com"]
]);

const PENDING_CLAIM_EMAILS = new Map<string, string>([
  ["senior-03", "senior.03@pulsi.com"],
  ["senior-04", "senior.04@pulsi.com"],
  ["u18-03", "u18.03@pulsi.com"],
  ["u18-04", "u18.04@pulsi.com"]
]);

const POSITION_ROTATION = ["Goalkeeper", "Center Back", "Full Back", "Midfielder", "Winger", "Forward"];

const main = async () => {
  await ensureDemoSchema();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const tenant = await upsertTenant();
  const staffUsers = await upsertStaffUsers(passwordHash);
  const squadRecords = await upsertSquads(tenant.id);
  const squadBySlug = new Map(squadRecords.map((squad) => [squad.slug, squad]));

  await upsertMemberships({
    tenantId: tenant.id,
    squadBySlug,
    staffUsers
  });

  const athleteRecords = await upsertAthletes(tenant.id, squadBySlug);
  const athleteByExternalRef = new Map(athleteRecords.map((athlete) => [athlete.externalRef ?? "", athlete]));
  const connectedAthleteIds = new Set(
    athleteRecords.filter((_, index) => index < 24).map((athlete) => athlete.id)
  );

  const garminConnections = await upsertGarminConnections(tenant.id, athleteRecords, connectedAthleteIds);
  await upsertReadinessFixtures(tenant.id, athleteRecords, garminConnections, connectedAthleteIds);

  const athleteUsers = await upsertClaimedAthleteUsers({
    passwordHash,
    athleteByExternalRef
  });
  const claimLinks = await upsertPendingClaimLinks({
    tenantId: tenant.id,
    createdByUserId: staffUsers.get("owner")!.id,
    athleteByExternalRef
  });

  printSummary({
    tenant,
    staffUsers,
    athleteUsers,
    claimLinks
  });
};

const ensureDemoSchema = async () => {
  const result = await db.execute(sql`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'staff_memberships'
        and column_name = 'access_scope'
    ) as has_access_scope
  `);

  const row = result[0] as { has_access_scope?: boolean } | undefined;
  if (!row?.has_access_scope) {
    throw new Error(
      "Database schema is out of date for demo seeding. Run `pnpm db:migrate:api` before `pnpm db:seed:demo`."
    );
  }
};

const upsertTenant = async () => {
  const [existing] = await db.select().from(tenants).where(eq(tenants.slug, DEMO_TENANT.slug)).limit(1);

  if (existing) {
    const [updated] = await db
      .update(tenants)
      .set({
        name: DEMO_TENANT.name,
        timezone: DEMO_TENANT.timezone,
        updatedAt: TODAY
      })
      .where(eq(tenants.id, existing.id))
      .returning();

    return updated ?? existing;
  }

  const [tenant] = await db
    .insert(tenants)
    .values({
      slug: DEMO_TENANT.slug,
      name: DEMO_TENANT.name,
      timezone: DEMO_TENANT.timezone
    })
    .returning();

  if (!tenant) {
    throw new Error("Failed to create demo tenant");
  }

  return tenant;
};

const upsertAuthUser = async (input: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}) => {
  const normalizedEmail = input.email.toLowerCase();
  const [existing] = await db.select().from(user).where(eq(user.email, normalizedEmail)).limit(1);

  let userRecord: typeof user.$inferSelect | null = existing ?? null;
  if (existing) {
    const [updated] = await db
      .update(user)
      .set({
        name: input.name,
        emailVerified: true,
        updatedAt: TODAY
      })
      .where(eq(user.id, existing.id))
      .returning();
    userRecord = updated ?? existing;
  } else {
    const [created] = await db
      .insert(user)
      .values({
        id: input.id,
        name: input.name,
        email: normalizedEmail,
        emailVerified: true,
        image: null,
        createdAt: TODAY,
        updatedAt: TODAY
      })
      .returning();
    userRecord = created ?? null;
  }

  if (!userRecord) {
    throw new Error(`Failed to upsert auth user for ${input.email}`);
  }

  await db
    .insert(account)
    .values({
      id: deterministicTextId(`account:${normalizedEmail}`),
      accountId: userRecord.id,
      providerId: "credential",
      userId: userRecord.id,
      password: input.passwordHash,
      createdAt: TODAY,
      updatedAt: TODAY
    })
    .onConflictDoUpdate({
      target: [account.providerId, account.accountId],
      set: {
        password: input.passwordHash,
        updatedAt: TODAY
      }
    });

  return userRecord;
};

const upsertStaffUsers = async (passwordHash: string) => {
  const users = new Map<string, typeof user.$inferSelect>();

  for (const fixture of STAFF_FIXTURES) {
    const record = await upsertAuthUser({
      id: deterministicTextId(`staff:${fixture.email}`),
      name: fixture.name,
      email: fixture.email,
      passwordHash
    });

    users.set(fixture.key, record);
  }

  return users;
};

const upsertMemberships = async (input: {
  tenantId: string;
  squadBySlug: Map<string, typeof squads.$inferSelect>;
  staffUsers: Map<string, typeof user.$inferSelect>;
}) => {
  for (const fixture of STAFF_FIXTURES) {
    const userRecord = input.staffUsers.get(fixture.key);
    if (!userRecord) {
      throw new Error(`Missing seeded staff user for ${fixture.email}`);
    }

    await db
      .insert(staffMemberships)
      .values({
        tenantId: input.tenantId,
        userId: userRecord.id,
        role: fixture.role,
        status: "active",
        accessScope: fixture.accessScope,
        isDefaultTenant: true,
        invitedByUserId: null,
        createdAt: TODAY,
        updatedAt: TODAY
      })
      .onConflictDoUpdate({
        target: [staffMemberships.tenantId, staffMemberships.userId],
        set: {
          role: fixture.role,
          status: "active",
          accessScope: fixture.accessScope,
          isDefaultTenant: true,
          updatedAt: TODAY
        }
      });

    // Replace grants wholesale so rerunning the seed always resets restricted staff
    // back to the intended squad visibility.
    await db
      .delete(tenantUserSquadAccess)
      .where(
        and(
          eq(tenantUserSquadAccess.tenantId, input.tenantId),
          eq(tenantUserSquadAccess.userId, userRecord.id)
        )
      );

    if (fixture.accessScope === "assigned_squads") {
      const values = fixture.squadSlugs.map((slug) => {
        const squad = input.squadBySlug.get(slug);
        if (!squad) {
          throw new Error(`Missing demo squad ${slug} while applying staff access`);
        }

        return {
          tenantId: input.tenantId,
          userId: userRecord.id,
          squadId: squad.id,
          createdAt: TODAY
        };
      });

      if (values.length > 0) {
        await db.insert(tenantUserSquadAccess).values(values).onConflictDoNothing();
      }
    }
  }
};

const upsertSquads = async (tenantId: string) => {
  const records: Array<typeof squads.$inferSelect> = [];

  for (const fixture of SQUAD_FIXTURES) {
    const [existing] = await db
      .select()
      .from(squads)
      .where(and(eq(squads.tenantId, tenantId), eq(squads.slug, fixture.slug)))
      .limit(1);

    let squadRecord: typeof squads.$inferSelect | null = existing ?? null;
    if (existing) {
      const [updated] = await db
        .update(squads)
        .set({
          name: fixture.name,
          category: fixture.category,
          status: "active",
          updatedAt: TODAY
        })
        .where(eq(squads.id, existing.id))
        .returning();
      squadRecord = updated ?? existing;
    } else {
      const [created] = await db
        .insert(squads)
        .values({
          tenantId,
          slug: fixture.slug,
          name: fixture.name,
          category: fixture.category,
          status: "active",
          createdAt: TODAY,
          updatedAt: TODAY
        })
        .returning();
      squadRecord = created ?? null;
    }

    if (!squadRecord) {
      throw new Error(`Failed to upsert squad ${fixture.slug}`);
    }

    records.push(squadRecord);
  }

  return records;
};

const upsertAthletes = async (
  tenantId: string,
  squadBySlug: Map<string, typeof squads.$inferSelect>
) => {
  const records: Array<typeof athletes.$inferSelect & { currentSquadId: string }> = [];

  for (const squadFixture of SQUAD_FIXTURES) {
    const squad = squadBySlug.get(squadFixture.slug);
    if (!squad) {
      throw new Error(`Missing squad ${squadFixture.slug}`);
    }

    for (let index = 1; index <= 15; index += 1) {
      const externalRef = `${squadFixture.slug}-${String(index).padStart(2, "0")}`;
      const firstName = `${squadFixture.slug === "senior" ? "Senior" : "Academy"}${index}`;
      const lastName = `Player${String(index).padStart(2, "0")}`;
      const position = POSITION_ROTATION[(index - 1) % POSITION_ROTATION.length];

      const [existing] = await db
        .select()
        .from(athletes)
        .where(and(eq(athletes.tenantId, tenantId), eq(athletes.externalRef, externalRef)))
        .limit(1);

      let athleteRecord: typeof athletes.$inferSelect | null = existing ?? null;
      if (existing) {
        const [updated] = await db
          .update(athletes)
          .set({
            firstName,
            lastName,
            position,
            status: "active",
            updatedAt: TODAY
          })
          .where(eq(athletes.id, existing.id))
          .returning();
        athleteRecord = updated ?? existing;
      } else {
        const [created] = await db
          .insert(athletes)
          .values({
            tenantId,
            externalRef,
            firstName,
            lastName,
            position,
            status: "active",
            createdAt: TODAY,
            updatedAt: TODAY
          })
          .returning();
        athleteRecord = created ?? null;
      }

      if (!athleteRecord) {
        throw new Error(`Failed to upsert athlete ${externalRef}`);
      }

      const [activeAssignment] = await db
        .select()
        .from(athleteSquadAssignments)
        .where(
          and(
            eq(athleteSquadAssignments.tenantId, tenantId),
            eq(athleteSquadAssignments.athleteId, athleteRecord.id),
            isNull(athleteSquadAssignments.endedAt)
          )
        )
        .limit(1);

      if (activeAssignment) {
        await db
          .update(athleteSquadAssignments)
          .set({
            squadId: squad.id,
            startedAt: TODAY,
            updatedAt: TODAY
          })
          .where(eq(athleteSquadAssignments.id, activeAssignment.id));
      } else {
        await db.insert(athleteSquadAssignments).values({
          id: deterministicUuid(`athlete-squad:${externalRef}`),
          tenantId,
          athleteId: athleteRecord.id,
          squadId: squad.id,
          startedAt: TODAY,
          endedAt: null,
          createdAt: TODAY,
          updatedAt: TODAY
        });
      }

      records.push({
        ...athleteRecord,
        currentSquadId: squad.id
      });
    }
  }

  return records.sort((left, right) => (left.externalRef ?? "").localeCompare(right.externalRef ?? ""));
};

const upsertGarminConnections = async (
  tenantId: string,
  athletesToSeed: Array<typeof athletes.$inferSelect & { currentSquadId: string }>,
  connectedAthleteIds: Set<string>
) => {
  const connectionByAthleteId = new Map<string, typeof athleteIntegrations.$inferSelect>();

  for (const athleteRecord of athletesToSeed) {
    if (!connectedAthleteIds.has(athleteRecord.id)) {
      continue;
    }

    const externalRef = athleteRecord.externalRef ?? athleteRecord.id;
    const connectionId = deterministicUuid(`garmin-connection:${externalRef}`);
    const providerUserId = `garmin-demo-${externalRef}`;

    const [connection] = await db
      .insert(athleteIntegrations)
      .values({
        id: connectionId,
        tenantId,
        athleteId: athleteRecord.id,
        provider: "garmin",
        providerUserId,
        credentialKey: deterministicUuid(`garmin-credential:${externalRef}`),
        status: "active",
        grantedPermissions: ["dailies", "sleeps", "hrv", "activitySummaries"],
        lastPermissionsSyncAt: TODAY,
        lastSuccessfulSyncAt: TODAY,
        metadata: {
          seeded: true
        },
        createdAt: TODAY,
        updatedAt: TODAY
      })
      .onConflictDoUpdate({
        target: [athleteIntegrations.athleteId, athleteIntegrations.provider],
        set: {
          providerUserId,
          status: "active",
          grantedPermissions: ["dailies", "sleeps", "hrv", "activitySummaries"],
          lastPermissionsSyncAt: TODAY,
          lastSuccessfulSyncAt: TODAY,
          updatedAt: TODAY,
          metadata: {
            seeded: true
          }
        }
      })
      .returning();

    if (!connection) {
      throw new Error(`Failed to upsert Garmin connection for ${externalRef}`);
    }

    connectionByAthleteId.set(athleteRecord.id, connection);
  }

  return connectionByAthleteId;
};

const upsertReadinessFixtures = async (
  tenantId: string,
  athleteRecords: Array<typeof athletes.$inferSelect & { currentSquadId: string }>,
  connectionByAthleteId: Map<string, typeof athleteIntegrations.$inferSelect>,
  connectedAthleteIds: Set<string>
) => {
  for (const [index, athleteRecord] of athleteRecords.entries()) {
    if (!connectedAthleteIds.has(athleteRecord.id)) {
      continue;
    }

    const connection = connectionByAthleteId.get(athleteRecord.id);
    if (!connection) {
      continue;
    }

    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const metricDate = toDateString(daysAgo(TODAY, dayOffset));
      const seeded = buildReadinessFixture(index, dayOffset);
      const metricId = deterministicUuid(`metric:${athleteRecord.externalRef}:${metricDate}`);

      await db
        .insert(wearableDailyMetrics)
        .values({
          id: metricId,
          tenantId,
          athleteId: athleteRecord.id,
          sourceConnectionId: connection.id,
          provider: "garmin",
          metricDate,
          restingHeartRate: seeded.restingHeartRate,
          hrvNightlyMs: seeded.hrvNightlyMs,
          sleepDurationMinutes: seeded.sleepDurationMinutes,
          sleepScore: seeded.sleepScore,
          bodyBatteryHigh: seeded.bodyBatteryHigh,
          bodyBatteryLow: seeded.bodyBatteryLow,
          stressAverage: seeded.stressAverage,
          trainingReadiness: seeded.trainingReadiness,
          rawPayload: {
            seeded: true,
            athleteExternalRef: athleteRecord.externalRef
          },
          ingestedAt: TODAY
        })
        .onConflictDoUpdate({
          target: [wearableDailyMetrics.athleteId, wearableDailyMetrics.metricDate, wearableDailyMetrics.provider],
          set: {
            sourceConnectionId: connection.id,
            restingHeartRate: seeded.restingHeartRate,
            hrvNightlyMs: seeded.hrvNightlyMs,
            sleepDurationMinutes: seeded.sleepDurationMinutes,
            sleepScore: seeded.sleepScore,
            bodyBatteryHigh: seeded.bodyBatteryHigh,
            bodyBatteryLow: seeded.bodyBatteryLow,
            stressAverage: seeded.stressAverage,
            trainingReadiness: seeded.trainingReadiness,
            rawPayload: {
              seeded: true,
              athleteExternalRef: athleteRecord.externalRef
            }
          }
        });

      await db
        .insert(readinessSnapshots)
        .values({
          id: deterministicUuid(`snapshot:${athleteRecord.externalRef}:${metricDate}`),
          tenantId,
          athleteId: athleteRecord.id,
          sourceMetricId: metricId,
          snapshotDate: metricDate,
          readinessScore: seeded.readinessScore,
          readinessBand: seeded.readinessBand,
          recommendation: seeded.recommendation,
          recoveryTrend: seeded.recoveryTrend,
          rationale: seeded.rationale,
          createdAt: TODAY
        })
        .onConflictDoUpdate({
          target: [readinessSnapshots.athleteId, readinessSnapshots.snapshotDate],
          set: {
            sourceMetricId: metricId,
            readinessScore: seeded.readinessScore,
            readinessBand: seeded.readinessBand,
            recommendation: seeded.recommendation,
            recoveryTrend: seeded.recoveryTrend,
            rationale: seeded.rationale,
            createdAt: TODAY
          }
        });
    }
  }
};

const upsertClaimedAthleteUsers = async (input: {
  passwordHash: string;
  athleteByExternalRef: Map<string, typeof athletes.$inferSelect & { currentSquadId: string }>;
}) => {
  const users = new Map<string, typeof user.$inferSelect>();

  for (const [externalRef, email] of CLAIMED_ATHLETE_EMAILS) {
    const athleteRecord = input.athleteByExternalRef.get(externalRef);
    if (!athleteRecord) {
      throw new Error(`Missing athlete ${externalRef} for claimed athlete seed`);
    }

    const authUser = await upsertAuthUser({
      id: deterministicTextId(`athlete:${email}`),
      name: `${athleteRecord.firstName} ${athleteRecord.lastName}`,
      email,
      passwordHash: input.passwordHash
    });

    await db
      .insert(athleteAccounts)
      .values({
        id: deterministicUuid(`athlete-user-account:${externalRef}`),
        athleteId: athleteRecord.id,
        userId: authUser.id,
        status: "active",
        claimedAt: TODAY,
        createdAt: TODAY,
        updatedAt: TODAY
      })
      .onConflictDoUpdate({
        target: athleteAccounts.userId,
        set: {
          athleteId: athleteRecord.id,
          status: "active",
          claimedAt: TODAY,
          updatedAt: TODAY
        }
      });

    users.set(email, authUser);
  }

  return users;
};

const upsertPendingClaimLinks = async (input: {
  tenantId: string;
  createdByUserId: string;
  athleteByExternalRef: Map<string, typeof athletes.$inferSelect & { currentSquadId: string }>;
}) => {
  const claimUrls: Array<{ athleteName: string; claimUrl: string; email: string }> = [];

  for (const [externalRef, email] of PENDING_CLAIM_EMAILS) {
    const athleteRecord = input.athleteByExternalRef.get(externalRef);
    if (!athleteRecord) {
      throw new Error(`Missing athlete ${externalRef} for pending claim seed`);
    }

    const rawToken = `demo-claim-${externalRef}`;
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const claimId = deterministicUuid(`claim-link:${externalRef}`);
    const expiresAt = daysFrom(TODAY, 14);

    await db
      .insert(athleteInvites)
      .values({
        id: claimId,
        tenantId: input.tenantId,
        athleteId: athleteRecord.id,
        email,
        tokenHash,
        status: "pending",
        expiresAt,
        createdByUserId: input.createdByUserId,
        claimedByUserId: null,
        claimedAt: null,
        createdAt: TODAY,
        updatedAt: TODAY
      })
      .onConflictDoUpdate({
        target: athleteInvites.tokenHash,
        set: {
          tenantId: input.tenantId,
          athleteId: athleteRecord.id,
          email,
          status: "pending",
          expiresAt,
          createdByUserId: input.createdByUserId,
          claimedByUserId: null,
          claimedAt: null,
          updatedAt: TODAY
        }
      });

    claimUrls.push({
      athleteName: `${athleteRecord.firstName} ${athleteRecord.lastName}`,
      email,
      claimUrl: `http://localhost:3000/athlete/setup/${rawToken}`
    });
  }

  return claimUrls;
};

const buildReadinessFixture = (athleteIndex: number, dayOffset: number) => {
  const base = 92 - ((athleteIndex * 7 + dayOffset * 3) % 55);
  const readinessScore = Math.max(38, Math.min(96, base));

  const readinessBand =
    readinessScore >= 78 ? "ready" : readinessScore >= 58 ? "caution" : "restricted";

  const recommendation =
    readinessBand === "ready"
      ? "full_load"
      : readinessBand === "caution"
        ? "monitor"
        : "reduced_load";

  const recoveryTrend =
    dayOffset <= 1 ? "stable" : readinessBand === "ready" ? "improving" : "declining";

  return {
    readinessScore,
    readinessBand,
    recommendation,
    recoveryTrend,
    restingHeartRate: 48 + ((athleteIndex + dayOffset) % 16),
    hrvNightlyMs: 48 + ((athleteIndex * 3 + dayOffset * 2) % 36),
    sleepDurationMinutes: 390 + ((athleteIndex * 11 + dayOffset * 5) % 120),
    sleepScore: Math.max(52, Math.min(96, readinessScore + 2)),
    bodyBatteryHigh: Math.max(55, Math.min(100, readinessScore + 5)),
    bodyBatteryLow: Math.max(10, Math.min(45, 28 - dayOffset + (athleteIndex % 8))),
    stressAverage: Math.max(18, Math.min(78, 90 - readinessScore)),
    trainingReadiness: Math.max(35, Math.min(100, readinessScore + 3)),
    rationale: buildRationale(readinessBand, recoveryTrend)
  } as const;
};

const buildRationale = (
  readinessBand: "ready" | "caution" | "restricted",
  recoveryTrend: "stable" | "improving" | "declining"
) => {
  if (readinessBand === "ready") {
    return recoveryTrend === "improving"
      ? ["Sleep and HRV are above baseline", "Recent recovery trend is improving"]
      : ["Overnight recovery is on baseline", "No restriction signals detected"];
  }

  if (readinessBand === "caution") {
    return ["Recovery signals are slightly below baseline", "Monitor session intensity today"];
  }

  return ["Multiple recovery markers are down", "Reduce load and reassess before full training"];
};

const printSummary = (input: {
  tenant: typeof tenants.$inferSelect;
  staffUsers: Map<string, typeof user.$inferSelect>;
  athleteUsers: Map<string, typeof user.$inferSelect>;
  claimLinks: Array<{ athleteName: string; claimUrl: string; email: string }>;
}) => {
  process.stdout.write(`\nSeeded demo environment for ${input.tenant.name} (${input.tenant.slug})\n`);
  process.stdout.write(`Shared demo password: ${DEMO_PASSWORD}\n\n`);
  process.stdout.write("Staff accounts:\n");
  for (const fixture of STAFF_FIXTURES) {
    process.stdout.write(`- ${fixture.email} (${fixture.role})\n`);
  }

  if (input.athleteUsers.size > 0) {
    process.stdout.write("\nClaimed athlete accounts:\n");
    for (const email of input.athleteUsers.keys()) {
      process.stdout.write(`- ${email}\n`);
    }
  }

  if (input.claimLinks.length > 0) {
    process.stdout.write("\nPending athlete setup invites:\n");
    for (const claimLink of input.claimLinks) {
      process.stdout.write(`- ${claimLink.athleteName} <${claimLink.email}> -> ${claimLink.claimUrl}\n`);
    }
  }
};

const deterministicUuid = (seed: string) => {
  const hex = createHash("sha1").update(seed).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const deterministicTextId = (seed: string) => `demo_${createHash("sha1").update(seed).digest("hex").slice(0, 24)}`;

const daysAgo = (date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
const daysFrom = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const toDateString = (date: Date) => date.toISOString().slice(0, 10);

const formatSeedError = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42P01"
  ) {
    return "Database schema is missing. Run `pnpm db:migrate:api` before `pnpm db:seed:demo`.";
  }

  return error instanceof Error ? error.stack ?? error.message : String(error);
};

const shutdown = async (exitCode: number) => {
  try {
    await closeDatabase();
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`Failed to close database client cleanly.\n${message}\n`);
    process.exit(exitCode === 0 ? 1 : exitCode);
  }

  process.exit(exitCode);
};

void main()
  .then(() => shutdown(0))
  .catch(async (error) => {
    const message = formatSeedError(error);
    process.stderr.write(`Demo seed failed.\n${message}\n`);
    await shutdown(1);
  });
