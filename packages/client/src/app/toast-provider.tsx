import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { Toast } from "@base-ui/react";

import { cn } from "../lib/cn";

type ToastTone = "accent" | "success" | "risk";

interface ToastItem {
  id: string;
  title: string;
  body: string;
  tone: ToastTone;
}

const ToastContext = createContext<{
  pushToast: (toast: { title: string; body: string; tone: ToastTone }) => void;
} | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutIds = useRef<Map<string, number>>(new Map());

  const closeToast = useCallback((toastId: string) => {
    const activeTimeout = timeoutIds.current.get(toastId);
    if (activeTimeout) {
      window.clearTimeout(activeTimeout);
      timeoutIds.current.delete(toastId);
    }

    setToasts((current) => current.filter((item) => item.id !== toastId));
  }, []);

  const pushToast = useCallback(
    ({ title, body, tone }: { title: string; body: string; tone: ToastTone }) => {
      const id = crypto.randomUUID();
      setToasts((current) => current.concat({ body, id, title, tone }).slice(-4));

      const timeoutId = window.setTimeout(() => {
        closeToast(id);
      }, 4500);

      timeoutIds.current.set(id, timeoutId);
    },
    [closeToast]
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <Toast.Provider limit={4} timeout={4500}>
      <ToastContext.Provider value={value}>
        {children}
        <Toast.Viewport className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-end gap-3 sm:inset-x-auto sm:right-5 sm:w-full sm:max-w-sm">
          {toasts.map((toast) => (
            <Toast.Root
              className={cn(
                "pointer-events-auto w-full rounded-[var(--radius-soft)] border px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl transition duration-200 data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0 data-[ending-style]:translate-y-1 data-[ending-style]:opacity-0",
                "data-[type=accent]:border-accent-500/25 data-[type=accent]:bg-accent-500/12 data-[type=accent]:text-obsidian-100",
                "data-[type=success]:border-ready-500/25 data-[type=success]:bg-ready-500/12 data-[type=success]:text-obsidian-100",
                "data-[type=risk]:border-risk-500/25 data-[type=risk]:bg-risk-500/12 data-[type=risk]:text-obsidian-100"
              )}
              key={toast.id}
              toast={{
                description: toast.body,
                id: toast.id,
                onClose: () => closeToast(toast.id),
                priority: toast.tone === "risk" ? "high" : "low",
                title: toast.title,
                type: toast.tone
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Toast.Title className="text-sm font-semibold" />
                  <Toast.Description className="mt-1 text-sm leading-6 text-obsidian-300" />
                </div>
                <Toast.Close
                  aria-label="Dismiss notification"
                  className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-xs font-semibold text-obsidian-200 transition hover:bg-white/14"
                  onClick={() => closeToast(toast.id)}
                >
                  ×
                </Toast.Close>
              </div>
            </Toast.Root>
          ))}
        </Toast.Viewport>
      </ToastContext.Provider>
    </Toast.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}
