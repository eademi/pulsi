import type { PropsWithChildren, ReactNode } from "react";
import { Tooltip } from "@base-ui/react";

export function MetricTooltip({
  content,
  children
}: PropsWithChildren<{ content: ReactNode }>) {
  return (
    <Tooltip.Provider delay={120}>
      <Tooltip.Root>
        <Tooltip.Trigger className="inline-flex">{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={10}>
            <Tooltip.Popup className="max-w-xs rounded-[var(--radius-soft)] border border-white/10 bg-obsidian-900 px-3 py-2 text-xs text-obsidian-200 shadow-2xl">
              {content}
              <Tooltip.Arrow className="fill-obsidian-900" />
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
