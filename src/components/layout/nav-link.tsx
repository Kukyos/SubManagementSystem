"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

// Exact match for section roots like /portal, prefix match for everything else.
export function NavLink({ href, label, exact, className }: { href: string; label: string; exact?: boolean; className?: string }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        active ? "bg-white/[0.06] text-fg" : "text-muted hover:bg-white/[0.03] hover:text-fg",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 [clip-path:polygon(50%_0,100%_100%,0_100%)]",
          active ? "bg-amber" : "bg-white/20",
        )}
      />
      {label}
    </Link>
  );
}
