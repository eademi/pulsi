import type { AthleteReadiness } from "@pulsi/shared";

export const ReadinessCard = ({ athleteReadiness }: { athleteReadiness: AthleteReadiness }) => {
  const snapshot = athleteReadiness.latestSnapshot;
  const bandClass = snapshot ? `band-${snapshot.readinessBand}` : "";

  return (
    <article className="surface athlete-card">
      <header className="athlete-card-header">
        <div>
          <p className="eyebrow">{athleteReadiness.athlete.squad ?? "First Team"}</p>
          <h3>
            {athleteReadiness.athlete.firstName} {athleteReadiness.athlete.lastName}
          </h3>
        </div>

        <div className="athlete-meta-pill">{athleteReadiness.athlete.position ?? "Player"}</div>
      </header>

      {snapshot ? (
        <div className="athlete-card-grid">
          <div className="score-block">
            <span className="eyebrow">Readiness score</span>
            <div className={`metric-value ${bandClass}`}>{snapshot.readinessScore}</div>
          </div>

          <div className="athlete-detail-stack">
            <div className="pill">{snapshot.recommendation.replaceAll("_", " ")}</div>
            <div className="athlete-rationale">{snapshot.rationale.join(" · ")}</div>
          </div>
        </div>
      ) : (
        <div className="muted">No wearable sync has produced a readiness snapshot yet.</div>
      )}
    </article>
  );
};
