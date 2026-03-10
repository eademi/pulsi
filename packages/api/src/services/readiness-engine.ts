import type {
  ReadinessBand,
  TrainingRecommendation
} from "@pulsi/shared";

import type { NormalizedWearableMetricRecord } from "../integrations/provider.types";

export interface DerivedReadinessDecision {
  readinessScore: number;
  readinessBand: ReadinessBand;
  recommendation: TrainingRecommendation;
  recoveryTrend: "stable" | "improving" | "declining";
  rationale: string[];
}

export class ReadinessEngine {
  public derive(metric: NormalizedWearableMetricRecord): DerivedReadinessDecision {
    const rationale: string[] = [];

    let score = metric.trainingReadiness ?? 55;

    if (metric.sleepScore !== null) {
      score = Math.round(score * 0.7 + metric.sleepScore * 0.3);
      if (metric.sleepScore < 55) {
        rationale.push("Sleep quality is below target");
      }
    }

    if (metric.bodyBatteryLow !== null && metric.bodyBatteryLow < 25) {
      score -= 8;
      rationale.push("Low morning energy reserve");
    }

    if (metric.stressAverage !== null && metric.stressAverage > 55) {
      score -= 6;
      rationale.push("Elevated stress trend");
    }

    if (metric.hrvNightlyMs !== null && metric.hrvNightlyMs < 35) {
      score -= 7;
      rationale.push("HRV trend suggests incomplete recovery");
    }

    const normalizedScore = Math.max(0, Math.min(100, score));
    const readinessBand =
      normalizedScore >= 75 ? "ready" : normalizedScore >= 55 ? "caution" : "restricted";

    if (rationale.length === 0) {
      rationale.push("Recovery indicators are stable");
    }

    return {
      readinessScore: normalizedScore,
      readinessBand,
      recommendation: recommendationForBand(readinessBand),
      recoveryTrend:
        normalizedScore >= 75 ? "improving" : normalizedScore >= 55 ? "stable" : "declining",
      rationale
    };
  }
}

const recommendationForBand = (band: ReadinessBand): TrainingRecommendation => {
  switch (band) {
    case "ready":
      return "full_load";
    case "caution":
      return "reduced_load";
    case "restricted":
      return "recovery_focus";
  }
};
