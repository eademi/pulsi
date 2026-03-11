import { cn } from "../../lib/cn";

export function Sparkline({
  points,
  status = "neutral",
  className
}: {
  points: number[];
  status?: "neutral" | "ready" | "caution" | "risk" | "accent";
  className?: string;
}) {
  if (points.length === 0) {
    return <div className={cn("h-16 rounded-md bg-white/4", className)} />;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);
  const path = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((point - min) / range) * 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg
      className={cn("h-16 w-full overflow-visible", className)}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <defs>
        <linearGradient id={`spark-${status}`} x1="0%" x2="100%" y1="0%" y2="0%">
          <stop
            offset="0%"
            stopColor={
              status === "ready"
                ? "#22c55e"
                : status === "caution"
                  ? "#f59e0b"
                  : status === "risk"
                    ? "#ef4444"
                    : "#38bdf8"
            }
          />
          <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke={`url(#spark-${status})`} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
