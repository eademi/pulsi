import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export function DataTable({ headers, children, className }: { headers: Array<string>; children: ReactNode; className?: string }) {
  return (
    <div className={cn("surface-panel overflow-hidden rounded-[var(--radius-panel)]", className)}>
      <div className="max-h-[36rem] overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-obsidian-900/95 backdrop-blur">
            <tr className="border-b border-white/8">
              {headers.map((header) => (
                <th
                  className="px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-obsidian-500"
                  key={header}
                  scope="col"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function DataRow({
  children,
  tone = "default",
  onClick,
}: {
  children: ReactNode;
  tone?: "default" | "ready" | "caution" | "risk";
  onClick?: () => void;
}) {
  return (
    <tr
      className={cn(
        "border-b border-white/6 transition hover:bg-white/4",
        tone === "ready" && "bg-ready-500/[0.04]",
        tone === "caution" && "bg-caution-500/[0.04]",
        tone === "risk" && "bg-risk-500/[0.05]",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function DataCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-top text-obsidian-200", className)}>{children}</td>;
}
