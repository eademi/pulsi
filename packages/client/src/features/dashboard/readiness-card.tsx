import type { AthleteReadiness } from "@pulsi/shared";

export const ReadinessCard = ({ athleteReadiness }: { athleteReadiness: AthleteReadiness }) => {
  const snapshot = athleteReadiness.latestSnapshot;
  const bandClass = snapshot ? `band-${snapshot.readinessBand}` : "";

  return (
    <article className="surface athlete-card">
      <div className="muted">
        {athleteReadiness.athlete.squad ?? "First Team"} · {athleteReadiness.athlete.position ?? "Player"}
      </div>
      <h3>
        {athleteReadiness.athlete.firstName} {athleteReadiness.athlete.lastName}
      </h3>

      {snapshot ? (
        <>
          <div className={`metric-value ${bandClass}`}>{snapshot.readinessScore}</div>
          <div className="pill">{snapshot.recommendation.replaceAll("_", " ")}</div>
          <div>{snapshot.rationale.join(" · ")}</div>
        </>
      ) : (
        <div className="muted">No wearable sync has produced a readiness snapshot yet.</div>
      )}
    </article>
  );
};
