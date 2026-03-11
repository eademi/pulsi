import { cn } from "../../lib/cn";

export function MetricStat({
  label,
  value,
  delta,
  tone = "default",
  helper
}: {
  label: string;
  value: string;
  delta?: string | null;
  tone?: "default" | "ready" | "caution" | "risk" | "accent";
  helper?: string;
}) {
  return (
    <article className="surface-panel rounded-[var(--radius-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{label}</p>
          <div
            className={cn(
              "mt-3 text-4xl font-semibold tracking-tight text-obsidian-100",
              tone === "ready" && "text-ready-500",
              tone === "caution" && "text-caution-500",
              tone === "risk" && "text-risk-500",
              tone === "accent" && "text-accent-400"
            )}
          >
            {value}
          </div>
        </div>
        {delta ? (
          <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-obsidian-300">
            {delta}
          </div>
        ) : null}
      </div>
      {helper ? <p className="mt-3 text-sm text-obsidian-400">{helper}</p> : null}
    </article>
  );
}
