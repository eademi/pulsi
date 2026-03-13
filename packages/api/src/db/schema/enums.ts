import { pgEnum } from "drizzle-orm/pg-core";

export const tenantRoleEnum = pgEnum("tenant_role", [
  "club_owner",
  "org_admin",
  "coach",
  "performance_staff",
  "analyst"
]);
export const membershipStatusEnum = pgEnum("membership_status", ["active", "invited", "disabled"]);
export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired"
]);
export const athleteStatusEnum = pgEnum("athlete_status", ["active", "inactive", "rehab"]);
export const athleteUserAccountStatusEnum = pgEnum("athlete_user_account_status", [
  "active",
  "revoked"
]);
export const athleteInviteStatusEnum = pgEnum("athlete_invite_status", [
  "pending",
  "accepted",
  "revoked",
  "expired"
]);
export const squadStatusEnum = pgEnum("squad_status", ["active", "inactive"]);
export const tenantAccessScopeEnum = pgEnum("tenant_access_scope", [
  "all_squads",
  "assigned_squads"
]);
export const readinessBandEnum = pgEnum("readiness_band", ["ready", "caution", "restricted"]);
export const trainingRecommendationEnum = pgEnum("training_recommendation", [
  "full_load",
  "reduced_load",
  "monitor",
  "recovery_focus"
]);
export const recoveryTrendEnum = pgEnum("recovery_trend", ["stable", "improving", "declining"]);
export const integrationProviderEnum = pgEnum("integration_provider", ["garmin"]);
export const connectionStatusEnum = pgEnum("connection_status", ["active", "revoked"]);
export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "running",
  "succeeded",
  "retryable_failure",
  "failed"
]);
export const oauthSessionStatusEnum = pgEnum("oauth_session_status", [
  "pending",
  "completed",
  "expired",
  "failed"
]);
export const credentialSubjectTypeEnum = pgEnum("credential_subject_type", ["athlete_connection"]);
export const webhookEventStatusEnum = pgEnum("webhook_event_status", [
  "received",
  "processed",
  "ignored",
  "failed"
]);
export const webhookDeliveryMethodEnum = pgEnum("webhook_delivery_method", [
  "push",
  "ping",
  "oauth"
]);
export const adminRoleEnum = pgEnum("admin_role", ["platform_admin", "support", "manager"]);
export const adminStatusEnum = pgEnum("admin_status", ["active", "disabled"]);
