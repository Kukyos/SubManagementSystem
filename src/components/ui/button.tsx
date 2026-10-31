import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold uppercase tracking-[0.025em] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-line-strong text-fg hover:bg-white/5",
  ghost: "text-muted hover:text-fg",
  danger: "border border-pink/40 text-pink hover:bg-pink/10",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[11px]",
  md: "h-10 px-4 text-[13px]",
  lg: "h-12 px-6 text-[13px]",
};

type StyleProps = { variant?: Variant; size?: Size };

export function buttonClass({ variant = "primary", size = "md" }: StyleProps = {}, extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & StyleProps) {
  return <button className={buttonClass({ variant, size }, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonClass({ variant, size }, className)} {...props} />;
}
