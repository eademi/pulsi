import { Tabs } from "@base-ui/react";

const RANGES = [
  { label: "Today", value: "today" },
  { label: "Last 7d", value: "7d" },
  { label: "Last 28d", value: "28d" },
  { label: "Custom", value: "custom" }
] as const;

export function DateRangeTabs({
  value,
  onValueChange
}: {
  value: (typeof RANGES)[number]["value"];
  onValueChange: (value: (typeof RANGES)[number]["value"]) => void;
}) {
  return (
    <Tabs.Root onValueChange={(next) => onValueChange(next as never)} value={value}>
      <Tabs.List className="inline-flex rounded-[var(--radius-soft)] border border-white/10 bg-white/5 p-1">
        {RANGES.map((range) => (
          <Tabs.Tab
            className="rounded-[calc(var(--radius-soft)-2px)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-obsidian-400 data-[selected]:bg-accent-500 data-[selected]:text-obsidian-950"
            key={range.value}
            value={range.value}
          >
            {range.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
