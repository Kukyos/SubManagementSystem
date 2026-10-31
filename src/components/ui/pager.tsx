import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/format";

// Previous / next for server-paged lists. `params` are the list's current filters.
export function Pager({
  path,
  params,
  page,
  pageSize,
  total,
  noun,
}: {
  path: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
  noun: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const href = (p: number) => {
    const qs = new URLSearchParams(Object.entries({ ...params, page: String(p) }).filter((e): e is [string, string] => !!e[1]));
    return `${path}?${qs}`;
  };
  const step = (p: number, label: string, off: boolean) => (
    <Link
      href={href(p)}
      aria-disabled={off}
      tabIndex={off ? -1 : undefined}
      className={cn(buttonClass({ variant: "secondary", size: "sm" }), off && "pointer-events-none opacity-40")}
    >
      {label}
    </Link>
  );

  return (
    <nav className="mt-4 flex items-center justify-between text-sm text-muted" aria-label="Pages">
      <span>
        {total} {noun} · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {step(page - 1, "Previous", page <= 1)}
        {step(page + 1, "Next", page >= pages)}
      </div>
    </nav>
  );
}
