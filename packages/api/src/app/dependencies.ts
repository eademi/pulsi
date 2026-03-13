import type { Database } from "../db/client";
import { GarminApiClient } from "../integrations/garmin/garmin-client";
import { GarminMapper } from "../integrations/garmin/garmin-mapper";
import { TokenCipher } from "../integrations/garmin/token-cipher";
import { env } from "../env";
import { AdminProfileRepository } from "../repositories/admin-profile-repository";
import { ActivityRepository } from "../repositories/activity-repository";
import { AthleteAccountRepository } from "../repositories/athlete-account-repository";
import { AthleteInviteRepository } from "../repositories/athlete-invite-repository";
import { AthleteRepository } from "../repositories/athlete-repository";
import { GarminRepository } from "../repositories/garmin-repository";
import { IntegrationRepository } from "../repositories/integration-repository";
import { InvitationRepository } from "../repositories/invitation-repository";
import { MembershipRepository } from "../repositories/membership-repository";
import { ReadinessRepository } from "../repositories/readiness-repository";
import { SquadRepository } from "../repositories/squad-repository";
import { TenantRepository } from "../repositories/tenant-repository";
import { ActivityService } from "../services/activity-service";
import { AdminGarminService } from "../services/admin-garmin-service";
import { AthleteAccountService } from "../services/athlete-account-service";
import { AthleteManagementService } from "../services/athlete-management-service";
import { GarminActivityIngestionService } from "../services/garmin-activity-ingestion-service";
import { GarminBackfillService } from "../services/garmin-backfill-service";
import { GarminHealthIngestionService } from "../services/garmin-health-ingestion-service";
import { GarminLifecycleService } from "../services/garmin-lifecycle-service";
import { GarminOAuthService } from "../services/garmin-oauth-service";
import { GarminTokenService } from "../services/garmin-token-service";
import { MetricIngestionService } from "../services/metric-ingestion-service";
import { ReadinessEngine } from "../services/readiness-engine";
import { ReadinessService } from "../services/readiness-service";
import { SquadService } from "../services/squad-service";
import { TenantAccessService } from "../services/tenant-access-service";
import { TenantService } from "../services/tenant-service";

export const buildRepositories = (db: Database) => {
  const tenantRepository = new TenantRepository(db);
  const membershipRepository = new MembershipRepository(db);
  const invitationRepository = new InvitationRepository(db);
  const athleteRepository = new AthleteRepository(db);
  const athleteAccountRepository = new AthleteAccountRepository(db);
  const athleteInviteRepository = new AthleteInviteRepository(db);
  const garminRepository = new GarminRepository(db);
  const integrationRepository = new IntegrationRepository(db);
  const readinessRepository = new ReadinessRepository(db);
  const activityRepository = new ActivityRepository(db);
  const squadRepository = new SquadRepository(db);
  const adminProfileRepository = new AdminProfileRepository(db);

  return {
    tenantRepository,
    membershipRepository,
    invitationRepository,
    athleteRepository,
    athleteAccountRepository,
    athleteInviteRepository,
    garminRepository,
    integrationRepository,
    readinessRepository,
    activityRepository,
    squadRepository,
    adminProfileRepository
  };
};

export const buildServices = (
  db: Database,
  repositories: ReturnType<typeof buildRepositories>
) => {
  const tokenCipher = new TokenCipher();
  const garminApiClient = new GarminApiClient();
  const garminMapper = new GarminMapper();
  const readinessEngine = new ReadinessEngine();
  const tenantAccessService = new TenantAccessService(repositories.membershipRepository);
  const tenantService = new TenantService(
    db,
    repositories.tenantRepository,
    repositories.membershipRepository,
    repositories.invitationRepository,
    repositories.squadRepository
  );
  const athleteAccountService = new AthleteAccountService(
    db,
    repositories.athleteRepository,
    repositories.athleteAccountRepository,
    repositories.athleteInviteRepository,
    repositories.readinessRepository,
    repositories.garminRepository,
    env.CLIENT_URL
  );
  const athleteManagementService = new AthleteManagementService(
    db,
    repositories.athleteRepository,
    repositories.squadRepository,
    repositories.athleteAccountRepository,
    repositories.athleteInviteRepository,
    repositories.garminRepository
  );
  const activityService = new ActivityService(
    repositories.athleteRepository,
    repositories.activityRepository
  );
  const readinessService = new ReadinessService(
    repositories.athleteRepository,
    repositories.readinessRepository
  );
  const squadService = new SquadService(repositories.squadRepository);
  const metricIngestionService = new MetricIngestionService(
    repositories.integrationRepository,
    readinessEngine
  );
  const garminTokenService = new GarminTokenService(
    repositories.garminRepository,
    garminApiClient,
    tokenCipher
  );
  const garminBackfillService = new GarminBackfillService(
    garminApiClient,
    garminTokenService,
    garminMapper,
    repositories.integrationRepository,
    metricIngestionService
  );
  const garminOAuthService = new GarminOAuthService(
    repositories.athleteRepository,
    repositories.athleteAccountRepository,
    repositories.garminRepository,
    garminApiClient,
    garminTokenService
  );
  const garminLifecycleService = new GarminLifecycleService(
    repositories.garminRepository,
    garminTokenService,
    garminApiClient
  );
  const garminHealthIngestionService = new GarminHealthIngestionService(
    repositories.garminRepository,
    garminApiClient,
    garminMapper,
    repositories.integrationRepository,
    metricIngestionService
  );
  const garminActivityIngestionService = new GarminActivityIngestionService(
    repositories.garminRepository,
    garminApiClient,
    garminMapper,
    repositories.integrationRepository
  );
  const adminGarminService = new AdminGarminService(
    db,
    repositories.garminRepository,
    garminBackfillService
  );

  return {
    garminApiClient,
    garminMapper,
    readinessEngine,
    tenantAccessService,
    tenantService,
    athleteAccountService,
    athleteManagementService,
    activityService,
    readinessService,
    squadService,
    metricIngestionService,
    garminTokenService,
    garminBackfillService,
    garminOAuthService,
    garminLifecycleService,
    garminHealthIngestionService,
    garminActivityIngestionService,
    adminGarminService
  };
};
