import { Dialog } from "@base-ui/react/dialog";
import { Link } from "react-router";

interface CommandItem {
  href: string;
  label: string;
  shortcut?: string;
  description: string;
}

export function CommandPalette({
  open,
  onOpenChange,
  items
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
}) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm" />
        <Dialog.Popup className="surface-panel fixed inset-x-4 top-24 z-50 mx-auto flex w-full max-w-2xl flex-col rounded-[var(--radius-panel)] p-4 outline-none">
          <Dialog.Title className="sr-only">Quick search</Dialog.Title>
          <div className="input-shell h-12 rounded-[var(--radius-soft)] border border-white/10">
            <span className="text-obsidian-500">⌘K</span>
            <input
              className="w-full bg-transparent text-sm text-obsidian-100 outline-none placeholder:text-obsidian-500"
              placeholder="Jump to dashboard, players, Garmin, reports..."
              readOnly
            />
          </div>
          <div className="mt-3 grid gap-1">
            {items.map((item) => (
              <Link
                className="flex items-center justify-between rounded-[var(--radius-soft)] px-3 py-3 transition hover:bg-accent-500/10"
                key={item.href}
                onClick={() => onOpenChange(false)}
                to={item.href}
              >
                <div>
                  <p className="text-sm font-medium text-obsidian-100">{item.label}</p>
                  <p className="text-xs text-obsidian-500">{item.description}</p>
                </div>
                {item.shortcut ? (
                  <span className="rounded border border-white/10 px-2 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-obsidian-500">
                    {item.shortcut}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
