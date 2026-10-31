import { Card } from "@/components/ui/card";
import { cn } from "@/lib/format";

export function Bone({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block h-3 rounded bg-ink/[0.07] motion-safe:animate-pulse", className)} />;
}

// Varied widths so rows don't read as a barcode.
const widths = ["w-2/3", "w-1/2", "w-3/4", "w-2/5", "w-3/5"];

export function HeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-8">
      <div className="space-y-3">
        <Bone className="h-2.5 w-16" />
        <Bone className="h-8 w-56" />
        <Bone className="w-80 max-w-full" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }, (_, i) => (
          <Bone key={i} className="h-9 w-28 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ cols, rows = 10, className }: { cols: number; rows?: number; className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex gap-6 bg-surface-2 px-5 py-3.5">
        {Array.from({ length: cols }, (_, c) => (
          <Bone key={c} className={cn("h-2.5 flex-1", c === 0 ? "max-w-24" : "max-w-16", c > 0 && c === cols - 1 && "ml-auto")} />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-6 px-5 py-3.5">
            {Array.from({ length: cols }, (_, c) => (
              <div key={c} className={cn("flex-1", c === 0 && "flex-[1.6] space-y-1.5")}>
                <Bone className={cn(widths[(r + c) % widths.length], c === cols - 1 && c > 0 && "ml-auto w-16")} />
                {c === 0 && <Bone className="h-2.5 w-2/5 opacity-60" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function StatsSkeleton({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn("grid gap-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="space-y-4 p-5">
          <Bone className="h-2.5 w-24" />
          <Bone className="h-9 w-32" />
          <Bone className="h-2.5 w-20 opacity-60" />
        </Card>
      ))}
    </div>
  );
}

// A card with a titled header and either form-like fields or text lines.
export function PanelSkeleton({ lines = 4, fields, className, bodyClassName }: { lines?: number; fields?: number; className?: string; bodyClassName?: string }) {
  return (
    <Card className={className}>
      <div className="border-b border-line px-5 py-4">
        <Bone className="w-28" />
      </div>
      <div className={cn("space-y-4 p-5", bodyClassName)}>
        {fields
          ? Array.from({ length: fields }, (_, i) => (
              <div key={i} className="space-y-2">
                <Bone className="h-2.5 w-20" />
                <Bone className="h-9 w-full rounded-lg" />
              </div>
            ))
          : Array.from({ length: lines }, (_, i) => <Bone key={i} className={widths[i % widths.length]} />)}
      </div>
    </Card>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  const heights = [40, 62, 48, 75, 55, 82, 68, 90, 60, 78, 70, 85];
  return (
    <Card className={className}>
      <div className="border-b border-line px-5 py-4">
        <Bone className="w-40" />
      </div>
      <div className="flex h-56 items-end gap-2 p-5">
        {heights.map((h, i) => (
          <span key={i} aria-hidden className="flex-1 rounded-t bg-ink/[0.06] motion-safe:animate-pulse" style={{ height: `${h}%` }} />
        ))}
      </div>
    </Card>
  );
}

export function FilterSkeleton({ tabs = 0 }: { tabs?: number }) {
  return (
    <>
      {tabs > 0 && (
        <div className="mb-4 flex gap-4 border-b border-line pb-3">
          {Array.from({ length: tabs }, (_, i) => (
            <Bone key={i} className="w-20" />
          ))}
        </div>
      )}
      <div className="mb-4 flex gap-2">
        <Bone className="h-9 w-72 max-w-full rounded-lg" />
        <Bone className="h-9 w-20 rounded-lg" />
      </div>
    </>
  );
}

// Wraps a skeleton so screen readers hear one "Loading" instead of the bones.
export function Loading({ label = "Loading", children }: { label?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-label={label} aria-busy>
      {children}
    </div>
  );
}

export function ListSkeleton({ cols, tabs, actions = 2, filter = true }: { cols: number; tabs?: number; actions?: number; filter?: boolean }) {
  return (
    <Loading>
      <HeaderSkeleton actions={actions} />
      {filter && <FilterSkeleton tabs={tabs} />}
      <TableSkeleton cols={cols} />
    </Loading>
  );
}
