export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface-panel rounded-[var(--radius-soft)] border-dashed p-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-obsidian-500">No data</p>
      <h3 className="mt-3 text-xl font-semibold text-obsidian-100">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-obsidian-400">{body}</p>
    </div>
  );
}
