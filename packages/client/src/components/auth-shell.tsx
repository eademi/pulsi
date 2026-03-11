import type { PropsWithChildren } from "react";
import { Link } from "react-router";

export function AuthShell({
  title,
  description,
  children
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <main className="min-h-screen bg-transparent px-4 py-6 lg:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-grid flex rounded-[var(--radius-panel)] p-6 lg:p-10">
          <div className="flex max-w-xl flex-col justify-between">
            <div>
              <p className="eyebrow">Pulsi performance system</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-obsidian-100 lg:text-6xl">
                Data-dense readiness dashboards for elite football staff.
              </h1>
              <p className="mt-5 text-base leading-7 text-obsidian-400">
                Built for dark rooms, early sessions, and decisions that have to happen fast. Pulsi turns wearable data into a live performance board, not a wellness app.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Highlight title="Ready board" value="Scan go / no-go status at squad level in seconds." />
              <Highlight title="Load context" value="Pair readiness with actual exposure and trend direction." />
              <Highlight title="Staff control" value="Multi-role access without cross-club data leakage." />
            </div>
          </div>
        </section>

        <section className="surface-panel flex rounded-[var(--radius-panel)] p-6 lg:p-8">
          <div className="m-auto w-full max-w-md">
            <Link className="inline-flex items-center gap-3" to="/">
              <div className="flex size-11 items-center justify-center rounded-[var(--radius-soft)] bg-accent-500/15 text-sm font-semibold text-accent-400 shadow-[var(--shadow-glow)]">
                P
              </div>
              <div>
                <div className="text-base font-semibold text-obsidian-100">Pulsi</div>
                <div className="text-xs uppercase tracking-[0.18em] text-obsidian-500">Staff access</div>
              </div>
            </Link>

            <header className="mt-8">
              <p className="eyebrow">Secure access</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-obsidian-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-obsidian-400">{description}</p>
            </header>

            <div className="mt-8">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Highlight({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-soft)] border border-white/8 bg-white/[0.03] p-4">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-obsidian-500">{title}</div>
      <div className="mt-2 text-sm leading-6 text-obsidian-300">{value}</div>
    </div>
  );
}
