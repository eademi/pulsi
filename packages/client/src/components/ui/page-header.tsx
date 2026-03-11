import type { PropsWithChildren, ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}>) {
  return (
    <header className="surface-panel rounded-[var(--radius-panel)] p-5 lg:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-obsidian-100 lg:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-obsidian-400 lg:text-base">
            {description}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}
