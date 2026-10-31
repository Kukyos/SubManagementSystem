import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-card border border-line bg-surface", className)} {...props} />;
}

export function CardHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 border-b border-line px-5 py-4", className)}>
      <h2 className="text-sm font-medium">{title}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-[0.05em] text-muted">{label}</p>
      <p className="tabular mt-3 text-4xl font-light tracking-tight">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
