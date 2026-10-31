import { Logo } from "@/components/brand/logo";
import { NavLink } from "@/components/layout/nav-link";
import type { NavGroup } from "@/components/layout/nav-config";
import { UserMenu } from "@/components/layout/user-menu";
import { gutter } from "@/components/layout/shell";
import { cn } from "@/lib/format";
import type { CurrentUser } from "@/services/auth";

export function ConsoleShell({ user, groups, children }: { user: CurrentUser; groups: NavGroup[]; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen print:!hidden w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="px-5 py-5">
          <Logo href="/dashboard" />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6" aria-label="Main">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur print:hidden">
          <div className={cn(gutter, "flex h-16 items-center justify-between gap-4")}>
            <div className="md:hidden">
              <Logo href="/dashboard" />
            </div>
            <div className="hidden text-sm text-faint md:block">Brightloop console</div>
            <UserMenu user={user} />
          </div>
        </header>

        {/* Small screens: the sidebar becomes a scrollable strip. */}
        <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 md:hidden print:hidden" aria-label="Main">
          {groups.flatMap((g) => g.items).map((item) => (
            <NavLink key={item.href} {...item} className="shrink-0" />
          ))}
        </nav>

        <main className={cn(gutter, "flex-1 py-8 print:p-0")}>{children}</main>
      </div>
    </div>
  );
}
