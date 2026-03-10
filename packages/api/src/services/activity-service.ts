import type { ListAthleteActivitiesQuery } from "@pulsi/shared";

import { AppError } from "../http/errors";
import type { ActivityRepository } from "../repositories/activity-repository";
import type { AthleteRepository } from "../repositories/athlete-repository";

export class ActivityService {
  public constructor(
    private readonly athleteRepository: AthleteRepository,
    private readonly activityRepository: ActivityRepository
  ) {}

  public async listAthleteActivities(
    tenantId: string,
    athleteId: string,
    query: ListAthleteActivitiesQuery
  ) {
    const athlete = await this.athleteRepository.findByIdForTenant(tenantId, athleteId);

    if (!athlete) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Athlete not found");
    }

    const activities = await this.activityRepository.listAthleteActivities({
      tenantId,
      athleteId,
      query
    });

    return {
      athlete: {
        ...athlete,
        createdAt: new Date(athlete.createdAt).toISOString()
      },
      activities: activities.map((activity) => ({
        id: activity.id,
        tenantId: activity.tenantId,
        athleteId: activity.athleteId,
        provider: activity.provider,
        providerActivityId: activity.providerSummaryId,
        summaryType: activity.summaryType,
        activityDate: activity.activityDate,
        activityType: activity.activityType,
        activityName: activity.activityName,
        startTimeInSeconds: activity.startTimeInSeconds,
        durationInSeconds: activity.durationInSeconds,
        distanceInMeters: activity.distanceInMeters,
        activeKilocalories: activity.activeKilocalories,
        averageHeartRate: activity.averageHeartRateInBeatsPerMinute,
        maxHeartRate: activity.maxHeartRateInBeatsPerMinute,
        averageSpeedMetersPerSecond: activity.averageSpeedInMetersPerSecond,
        maxSpeedMetersPerSecond: activity.maxSpeedInMetersPerSecond,
        averageCadenceStepsPerMinute: activity.averageCadenceInStepsPerMinute,
        maxCadenceStepsPerMinute: activity.maxCadenceInStepsPerMinute,
        elevationGainInMeters: activity.elevationGainInMeters,
        elevationLossInMeters: activity.elevationLossInMeters,
        deviceName: activity.deviceName,
        isManual: activity.isManual,
        isWebUpload: activity.isWebUpload,
        ingestedAt: new Date(activity.ingestedAt).toISOString()
      }))
    };
  }
}
