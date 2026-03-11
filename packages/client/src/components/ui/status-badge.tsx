import type { ReadinessBand } from "@pulsi/shared";

import { cn } from "../../lib/cn";

export function StatusBadge({
  status,
  label,
  muted = false
}: {
  status: ReadinessBand | "no_data" | "active";
  label?: string;
  muted?: boolean;
}) {
  const tone =
    status === "ready"
      ? "pill-ready"
      : status === "caution"
        ? "pill-caution"
        : status === "restricted"
          ? "pill-risk"
          : "pill-muted";

  return <span className={cn("pill", tone, muted && "opacity-85")}>{label ?? formatStatus(status)}</span>;
}

const formatStatus = (value: string) => value.replaceAll("_", " ");
