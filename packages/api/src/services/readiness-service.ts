import type { ListReadinessQuery } from "@pulsi/shared";

import type { AthleteRepository } from "../repositories/athlete-repository";
import type { ReadinessRepository } from "../repositories/readiness-repository";

export class ReadinessService {
  public constructor(
    private readonly athleteRepository: AthleteRepository,
    private readonly readinessRepository: ReadinessRepository
  ) {}

  public async listTenantReadiness(tenantId: string, query: ListReadinessQuery) {
    const athletes = await this.athleteRepository.listByTenant(tenantId, {
      squad: query.squad
    });

    const limitedAthletes = athletes.slice(0, query.limit);
    const athleteIds = limitedAthletes.map((athlete) => athlete.id);
    const snapshots = await this.readinessRepository.listSnapshotsForAthletes({
      tenantId,
      athleteIds,
      onDate: query.onDate
    });

    const latestByAthleteId = new Map<string, (typeof snapshots)[number]>();
    for (const record of snapshots) {
      if (!latestByAthleteId.has(record.snapshot.athleteId)) {
        latestByAthleteId.set(record.snapshot.athleteId, record);
      }
    }

    return limitedAthletes.map((athlete) => {
      const record = latestByAthleteId.get(athlete.id);

      return {
        athlete: {
          ...athlete,
          createdAt: toIsoString(athlete.createdAt)
        },
        latestSnapshot: record
          ? {
              ...record.snapshot,
              snapshotDate: record.snapshot.snapshotDate,
              createdAt: toIsoString(record.snapshot.createdAt),
              metrics: record.metric
                ? {
                    metricDate: record.metric.metricDate,
                    restingHeartRate: record.metric.restingHeartRate,
                    hrvNightlyMs: record.metric.hrvNightlyMs,
                    sleepDurationMinutes: record.metric.sleepDurationMinutes,
                    sleepScore: record.metric.sleepScore,
                    bodyBatteryHigh: record.metric.bodyBatteryHigh,
                    bodyBatteryLow: record.metric.bodyBatteryLow,
                    stressAverage: record.metric.stressAverage,
                    trainingReadiness: record.metric.trainingReadiness
                  }
                : {
                    metricDate: record.snapshot.snapshotDate,
                    restingHeartRate: null,
                    hrvNightlyMs: null,
                    sleepDurationMinutes: null,
                    sleepScore: null,
                    bodyBatteryHigh: null,
                    bodyBatteryLow: null,
                    stressAverage: null,
                    trainingReadiness: null
                  }
            }
          : null
      };
    });
  }
}

const toIsoString = (value: Date | string) => new Date(value).toISOString();
