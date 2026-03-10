import type { PropsWithChildren } from "react";
import { Link } from "react-router";

export const AuthShell = ({
  title,
  description,
  children
}: PropsWithChildren<{ title: string; description: string }>) => (
  <main className="auth-shell">
    <section className="auth-story">
      <div className="auth-story-panel">
        <p className="eyebrow">Pulsi</p>
        <h1>Turn wearable noise into training decisions coaches can trust.</h1>
        <p className="auth-copy">
          Pulsi gives football staff one place to read readiness, recent recovery signals, and
          extra workload before the day gets away from them.
        </p>

        <div className="auth-highlights">
          <div className="auth-highlight-card">
            <span>Ready today</span>
            <strong>Clear board-level view across the squad</strong>
          </div>
          <div className="auth-highlight-card">
            <span>Before training</span>
            <strong>Catch recovery dips before they turn into poor decisions</strong>
          </div>
          <div className="auth-highlight-card">
            <span>Multi-tenant</span>
            <strong>Each club stays isolated by design</strong>
          </div>
        </div>
      </div>
    </section>

    <section className="auth-panel">
      <div className="auth-card surface">
        <Link className="brand-lockup" to="/">
          <span className="brand-mark">P</span>
          <span className="brand-copy">
            <strong>Pulsi</strong>
            <small>Performance readiness platform</small>
          </span>
        </Link>

        <header className="auth-header">
          <p className="eyebrow">Secure access</p>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </header>

        {children}
      </div>
    </section>
  </main>
);
