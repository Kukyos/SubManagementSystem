import Link from "next/link";
import { cn } from "@/lib/format";

// Status filter as a row of counted tabs; the pipeline at a glance.
export function StatusTabs({
  path,
  tabs,
  current,
  params,
  all = tabs.reduce((n, t) => n + t.count, 0),
}: {
  path: string;
  tabs: { value: string; label: string; count: number; dot: string }[];
  current?: string;
  params?: Record<string, string | undefined>;
  all?: number;
}) {
  const href = (status?: string) => {
    const qs = new URLSearchParams(Object.entries({ ...params, status }).filter((e): e is [string, string] => !!e[1]));
    const s = qs.toString();
    return s ? `${path}?${s}` : path;
  };

  return (
    <nav aria-label="Filter by status" className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
      {[{ value: "", label: "All", count: all, dot: "bg-ink/40" }, ...tabs].map((t) => {
        const active = (current ?? "") === t.value;
        return (
          <Link
            key={t.value || "all"}
            href={href(t.value || undefined)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors",
              active ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg",
            )}
          >
            <span aria-hidden className={cn("size-2 [clip-path:polygon(50%_0,100%_100%,0_100%)]", t.dot)} />
            {t.label}
            <span className="tabular text-xs text-faint">{t.count.toLocaleString("en-IN")}</span>
          </Link>
        );
      })}
    </nav>
  );
}
