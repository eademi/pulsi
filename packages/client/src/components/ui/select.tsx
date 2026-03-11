import type { ReactNode } from "react";
import { Select } from "@base-ui/react/select";

import { cn } from "../../lib/cn";

export function FilterSelect({
  value,
  onValueChange,
  items,
  placeholder,
  className
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: Array<{ label: string; value: string }>;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Select.Root onValueChange={(nextValue) => onValueChange(nextValue ?? "")} value={value}>
      <Select.Trigger
        className={cn(
          "input-shell h-11 min-w-44 justify-between rounded-[var(--radius-soft)] border border-white/10 bg-obsidian-900/80 px-3.5",
          className
        )}
      >
        <Select.Value placeholder={placeholder ?? "Select"} />
        <Select.Icon>
          <ChevronDown />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="z-50 outline-none" sideOffset={8}>
          <Select.Popup className="surface-panel min-w-[var(--anchor-width)] rounded-[var(--radius-soft)] p-1 outline-none">
            <Select.List className="max-h-72 overflow-auto">
              {items.map((item) => (
                <Select.Item
                  className="flex cursor-default items-center justify-between rounded-[var(--radius-tight)] px-3 py-2 text-sm text-obsidian-200 outline-none data-[highlighted]:bg-accent-500/10 data-[selected]:bg-accent-500/16"
                  key={item.value}
                  value={item.value}
                >
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator className="text-accent-400">●</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function ChevronDown() {
  return (
    <svg className="size-4 text-obsidian-500" fill="none" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function SelectValuePill({ children }: { children: ReactNode }) {
  return <span className="pill pill-muted">{children}</span>;
}
