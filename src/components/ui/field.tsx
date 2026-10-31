import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

export const inputClass =
  "h-10 w-full rounded-field border border-line bg-surface-2 px-3 text-sm text-fg placeholder:text-faint transition-colors focus:border-accent focus:outline-none aria-[invalid=true]:border-pink";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "h-auto min-h-24 py-2", className)} {...props} />;
}

// Label + control + hint/error. Pass the control as children with a matching id.
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-pink">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-faint">{hint}</p>
      )}
    </div>
  );
}
