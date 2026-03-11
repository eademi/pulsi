export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-tight bg-white/6 ${className}`} />;
}
