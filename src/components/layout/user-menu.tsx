import Link from "next/link";
import { signOut } from "@/services/auth-actions";
import type { CurrentUser } from "@/services/auth";

const roleLabel = { admin: "Admin", staff: "Staff", customer: "Customer" } as const;

export function UserMenu({ user }: { user: CurrentUser }) {
  const initials = user.fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm leading-tight">{user.fullName}</p>
        <p className="text-xs text-faint">{roleLabel[user.role]}</p>
      </div>
      {/* Customers have a profile page; staff details live with the team in Settings. */}
      <Link
        href={user.role === "customer" ? "/portal/profile" : "/settings"}
        aria-label={user.role === "customer" ? "Your profile" : "Settings"}
        title={user.role === "customer" ? "Your profile" : "Settings"}
        className="grid size-8 place-items-center rounded-full border border-line-strong bg-surface-2 text-xs font-semibold transition-colors hover:border-accent hover:text-accent-hover"
      >
        {initials || "?"}
      </Link>
      <form action={signOut}>
        <button type="submit" className="text-xs font-semibold uppercase tracking-[0.025em] text-muted hover:text-fg">
          Sign out
        </button>
      </form>
    </div>
  );
}
