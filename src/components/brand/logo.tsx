import Link from "next/link";
import { cn } from "@/lib/format";

// A tetrahedron seen slightly from above: one shard of the loop.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <g fill="none" strokeWidth="1.6" strokeLinecap="round">
        <path d="M3 22 29 22" stroke="#edebff" strokeOpacity=".35" />
        <path d="M16 3 3 22M3 22 18 29" stroke="#ffb829" />
        <path d="M16 3 29 22M29 22 18 29" stroke="#8052ff" />
        <path d="M16 3 18 29" stroke="#2fd3a7" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)} aria-label="Brightloop home">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[-0.01em]">Brightloop</span>
    </Link>
  );
}
