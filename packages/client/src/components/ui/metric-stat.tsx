import { cn } from "../../lib/cn";

export function MetricStat({
  label,
  value,
  delta,
  tone = "default",
  helper,
  variant = "panel",
}: {
  label: string;
  value: string;
  delta?: string | null;
  tone?: "default" | "ready" | "caution" | "risk" | "accent";
  helper?: string;
  variant?: "panel" | "scoreboard";
}) {
  const valueTone = cn(
    "font-semibold tracking-tight text-obsidian-100",
    tone === "ready" && "text-ready-500",
    tone === "caution" && "text-caution-500",
    tone === "risk" && "text-risk-500",
    tone === "accent" && "text-accent-400",
  );

  if (variant === "scoreboard") {
    return (
      <article className="h-full min-w-0 p-4 lg:p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <p className="eyebrow max-w-34">{label}</p>
          {delta ? (
            <div className="max-w-32 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-right text-xs font-medium leading-5 text-obsidian-300">
              {delta}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className={cn("text-[2.35rem] leading-none lg:text-[2.8rem]", valueTone)}>{value}</div>
            {helper ? <p className="mt-3 max-w-[18rem] text-sm leading-6 text-obsidian-400">{helper}</p> : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="surface-panel rounded-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{label}</p>
          <div className={cn("mt-3 text-4xl", valueTone)}>{value}</div>
        </div>
        {delta ? <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-obsidian-300">{delta}</div> : null}
      </div>
      {helper ? <p className="mt-3 text-sm text-obsidian-400">{helper}</p> : null}
    </article>
  );
}
