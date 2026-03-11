import { cn } from "../../lib/cn";

export function AlertBanner({
  title,
  body,
  tone = "accent"
}: {
  title: string;
  body: string;
  tone?: "accent" | "warning" | "risk";
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-soft)] border px-4 py-3",
        tone === "accent" && "border-accent-500/25 bg-accent-500/10 text-obsidian-100",
        tone === "warning" && "border-caution-500/25 bg-caution-500/10 text-obsidian-100",
        tone === "risk" && "border-risk-500/25 bg-risk-500/10 text-obsidian-100"
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-obsidian-300">{body}</p>
    </div>
  );
}
