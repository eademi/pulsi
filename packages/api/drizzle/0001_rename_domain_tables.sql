ALTER TABLE "tenant_memberships" RENAME TO "staff_memberships";
ALTER TABLE "tenant_invitations" RENAME TO "staff_invitations";
ALTER TABLE "athlete_user_accounts" RENAME TO "athlete_accounts";
ALTER TABLE "athlete_claim_links" RENAME TO "athlete_invites";
ALTER TABLE "athlete_device_connections" RENAME TO "athlete_integrations";
ALTER TABLE "provider_credentials" RENAME TO "integration_credentials";
ALTER TABLE "provider_health_summaries" RENAME TO "integration_health_summaries";
ALTER TABLE "provider_activity_summaries" RENAME TO "integration_activity_summaries";
ALTER TABLE "provider_webhook_events" RENAME TO "integration_webhook_events";

ALTER TABLE "staff_memberships" RENAME CONSTRAINT "tenant_memberships_tenant_id_user_id_pk" TO "staff_memberships_tenant_id_user_id_pk";
ALTER TABLE "staff_memberships" RENAME CONSTRAINT "tenant_memberships_tenant_id_tenants_id_fk" TO "staff_memberships_tenant_id_tenants_id_fk";
ALTER TABLE "staff_memberships" RENAME CONSTRAINT "tenant_memberships_user_id_user_id_fk" TO "staff_memberships_user_id_user_id_fk";
ALTER TABLE "staff_memberships" RENAME CONSTRAINT "tenant_memberships_invited_by_user_id_user_id_fk" TO "staff_memberships_invited_by_user_id_user_id_fk";
ALTER INDEX "tenant_memberships_user_idx" RENAME TO "staff_memberships_user_idx";
ALTER INDEX "tenant_memberships_tenant_idx" RENAME TO "staff_memberships_tenant_idx";
ALTER INDEX "tenant_memberships_active_user_key" RENAME TO "staff_memberships_active_user_key";

ALTER TABLE "staff_invitations" RENAME CONSTRAINT "tenant_invitations_tenant_id_tenants_id_fk" TO "staff_invitations_tenant_id_tenants_id_fk";
ALTER TABLE "staff_invitations" RENAME CONSTRAINT "tenant_invitations_invited_by_user_id_user_id_fk" TO "staff_invitations_invited_by_user_id_user_id_fk";
ALTER TABLE "staff_invitations" RENAME CONSTRAINT "tenant_invitations_accepted_by_user_id_user_id_fk" TO "staff_invitations_accepted_by_user_id_user_id_fk";
ALTER INDEX "tenant_invitations_tenant_idx" RENAME TO "staff_invitations_tenant_idx";
ALTER INDEX "tenant_invitations_email_idx" RENAME TO "staff_invitations_email_idx";
ALTER INDEX "tenant_invitations_pending_key" RENAME TO "staff_invitations_pending_key";

ALTER TABLE "athlete_accounts" RENAME CONSTRAINT "athlete_user_accounts_athlete_id_athletes_id_fk" TO "athlete_accounts_athlete_id_athletes_id_fk";
ALTER TABLE "athlete_accounts" RENAME CONSTRAINT "athlete_user_accounts_user_id_user_id_fk" TO "athlete_accounts_user_id_user_id_fk";
ALTER INDEX "athlete_user_accounts_athlete_idx" RENAME TO "athlete_accounts_athlete_idx";
ALTER INDEX "athlete_user_accounts_user_idx" RENAME TO "athlete_accounts_user_idx";
ALTER INDEX "athlete_user_accounts_athlete_key" RENAME TO "athlete_accounts_athlete_key";
ALTER INDEX "athlete_user_accounts_user_key" RENAME TO "athlete_accounts_user_key";

ALTER TABLE "athlete_invites" RENAME CONSTRAINT "athlete_claim_links_tenant_id_tenants_id_fk" TO "athlete_invites_tenant_id_tenants_id_fk";
ALTER TABLE "athlete_invites" RENAME CONSTRAINT "athlete_claim_links_athlete_id_athletes_id_fk" TO "athlete_invites_athlete_id_athletes_id_fk";
ALTER TABLE "athlete_invites" RENAME CONSTRAINT "athlete_claim_links_created_by_user_id_user_id_fk" TO "athlete_invites_created_by_user_id_user_id_fk";
ALTER TABLE "athlete_invites" RENAME CONSTRAINT "athlete_claim_links_claimed_by_user_id_user_id_fk" TO "athlete_invites_claimed_by_user_id_user_id_fk";
ALTER INDEX "athlete_claim_links_tenant_idx" RENAME TO "athlete_invites_tenant_idx";
ALTER INDEX "athlete_claim_links_athlete_idx" RENAME TO "athlete_invites_athlete_idx";
ALTER INDEX "athlete_claim_links_email_idx" RENAME TO "athlete_invites_email_idx";
ALTER INDEX "athlete_claim_links_pending_athlete_key" RENAME TO "athlete_invites_pending_athlete_key";
ALTER INDEX "athlete_claim_links_token_hash_key" RENAME TO "athlete_invites_token_hash_key";

ALTER TABLE "athlete_integrations" RENAME CONSTRAINT "athlete_device_connections_tenant_id_tenants_id_fk" TO "athlete_integrations_tenant_id_tenants_id_fk";
ALTER TABLE "athlete_integrations" RENAME CONSTRAINT "athlete_device_connections_athlete_id_athletes_id_fk" TO "athlete_integrations_athlete_id_athletes_id_fk";
ALTER INDEX "athlete_device_connections_tenant_idx" RENAME TO "athlete_integrations_tenant_idx";
ALTER INDEX "athlete_device_connections_provider_user_idx" RENAME TO "athlete_integrations_provider_user_idx";
ALTER INDEX "athlete_device_connections_athlete_provider_key" RENAME TO "athlete_integrations_athlete_provider_key";

ALTER TABLE "integration_credentials" RENAME CONSTRAINT "provider_credentials_tenant_id_tenants_id_fk" TO "integration_credentials_tenant_id_tenants_id_fk";
ALTER TABLE "integration_credentials" RENAME CONSTRAINT "provider_credentials_subject_id_athlete_device_connections_id_fk" TO "integration_credentials_subject_id_athlete_integrations_id_fk";
ALTER INDEX "provider_credentials_subject_key" RENAME TO "integration_credentials_subject_key";
ALTER INDEX "provider_credentials_tenant_idx" RENAME TO "integration_credentials_tenant_idx";

ALTER TABLE "integration_health_summaries" RENAME CONSTRAINT "provider_health_summaries_tenant_id_tenants_id_fk" TO "integration_health_summaries_tenant_id_tenants_id_fk";
ALTER TABLE "integration_health_summaries" RENAME CONSTRAINT "provider_health_summaries_athlete_id_athletes_id_fk" TO "integration_health_summaries_athlete_id_athletes_id_fk";
ALTER TABLE "integration_health_summaries" RENAME CONSTRAINT "provider_health_summaries_connection_id_athlete_device_connections_id_fk" TO "integration_health_summaries_connection_id_athlete_integrations_id_fk";
ALTER INDEX "provider_health_summaries_tenant_idx" RENAME TO "integration_health_summaries_tenant_idx";
ALTER INDEX "provider_health_summaries_provider_user_idx" RENAME TO "integration_health_summaries_provider_user_idx";
ALTER INDEX "provider_health_summaries_summary_key" RENAME TO "integration_health_summaries_summary_key";

ALTER TABLE "integration_activity_summaries" RENAME CONSTRAINT "provider_activity_summaries_tenant_id_tenants_id_fk" TO "integration_activity_summaries_tenant_id_tenants_id_fk";
ALTER TABLE "integration_activity_summaries" RENAME CONSTRAINT "provider_activity_summaries_athlete_id_athletes_id_fk" TO "integration_activity_summaries_athlete_id_athletes_id_fk";
ALTER TABLE "integration_activity_summaries" RENAME CONSTRAINT "provider_activity_summaries_connection_id_athlete_device_connections_id_fk" TO "integration_activity_summaries_connection_id_athlete_integrations_id_fk";
ALTER INDEX "provider_activity_summaries_tenant_idx" RENAME TO "integration_activity_summaries_tenant_idx";
ALTER INDEX "provider_activity_summaries_athlete_idx" RENAME TO "integration_activity_summaries_athlete_idx";
ALTER INDEX "provider_activity_summaries_provider_user_idx" RENAME TO "integration_activity_summaries_provider_user_idx";
ALTER INDEX "provider_activity_summaries_summary_key" RENAME TO "integration_activity_summaries_summary_key";

ALTER TABLE "integration_webhook_events" RENAME CONSTRAINT "provider_webhook_events_tenant_id_tenants_id_fk" TO "integration_webhook_events_tenant_id_tenants_id_fk";
ALTER TABLE "integration_webhook_events" RENAME CONSTRAINT "provider_webhook_events_connection_id_athlete_device_connections_id_fk" TO "integration_webhook_events_connection_id_athlete_integrations_id_fk";
ALTER INDEX "provider_webhook_events_provider_idx" RENAME TO "integration_webhook_events_provider_idx";
ALTER INDEX "provider_webhook_events_tenant_idx" RENAME TO "integration_webhook_events_tenant_idx";

ALTER TABLE "integration_sync_jobs" RENAME CONSTRAINT "integration_sync_jobs_connection_id_athlete_device_connections_id_fk" TO "integration_sync_jobs_connection_id_athlete_integrations_id_fk";
ALTER TABLE "wearable_daily_metrics" RENAME CONSTRAINT "wearable_daily_metrics_source_connection_id_athlete_device_connections_id_fk" TO "wearable_daily_metrics_source_connection_id_athlete_integrations_id_fk";
