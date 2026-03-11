import { cn } from "../../lib/cn";

export function LoadBar({
  value,
  max = 100,
  label,
  className
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}) {
  const safeValue = Math.max(0, Math.min(value, max));
  const percent = (safeValue / max) * 100;
  const tone =
    percent >= 75 ? "bg-risk-500" : percent >= 50 ? "bg-caution-500" : "bg-ready-500";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label ? (
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-obsidian-500">
          <span>{label}</span>
          <span>{Math.round(percent)}%</span>
        </div>
      ) : null}
      <div className="h-2.5 rounded-full bg-white/6">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
