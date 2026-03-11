export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-tight)] bg-white/6 ${className}`} />;
}
