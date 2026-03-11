import type { PropsWithChildren, ReactNode } from "react";
import { Dialog } from "@base-ui/react";

export function SideSheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
}: PropsWithChildren<{
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
}>) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      {trigger ? <Dialog.Trigger render={<button />}>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-white/10 bg-obsidian-900 p-6 shadow-2xl outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-4">
            <div>
              <Dialog.Title className="text-xl font-semibold text-obsidian-100">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-1 text-sm text-obsidian-400">{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close className="btn-secondary size-10 rounded-full p-0">×</Dialog.Close>
          </div>
          <div className="mt-5 overflow-auto">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<button />}>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="surface-panel fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-panel p-6 outline-none">
          <Dialog.Title className="text-lg font-semibold text-obsidian-100">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-obsidian-400">{description}</Dialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close className="btn-secondary">Cancel</Dialog.Close>
            <Dialog.Close className="btn-danger" onClick={onConfirm}>
              {confirmLabel}
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function CenteredDialog({
  open,
  onOpenChange,
  title,
  description,
  widthClassName = "max-w-2xl",
  children,
  footer,
}: PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  widthClassName?: string;
  footer?: ReactNode;
}>) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm" />
        <Dialog.Popup
          className={`surface-panel fixed left-1/2 top-1/2 z-50 grid max-h-[min(88vh,44rem)] w-[min(92vw,42rem)] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-panel outline-none ${widthClassName}`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
            <div className="min-w-0">
              <Dialog.Title className="text-xl font-semibold text-obsidian-100">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-2 text-sm leading-6 text-obsidian-400">{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close className="btn-secondary size-10 shrink-0 rounded-full p-0" aria-label="Close dialog">
              ×
            </Dialog.Close>
          </div>

          <div className="min-h-0 overflow-y-auto px-6 py-5">{children}</div>

          {footer ? <div className="flex items-center justify-end gap-3 border-t border-white/8 px-6 py-4">{footer}</div> : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
