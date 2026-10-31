import { Logo } from "@/components/brand/logo";
import { NavLink } from "@/components/layout/nav-link";
import { consoleNav } from "@/components/layout/nav-config";
import { UserMenu } from "@/components/layout/user-menu";
import { requireRole } from "@/services/auth";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin", "staff");
  const groups = consoleNav
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(user.role)) }))
    .filter((g) => g.items.length);

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
        <header className="sticky top-0 z-20 flex h-16 print:hidden items-center justify-between gap-4 border-b border-line bg-bg/80 px-4 backdrop-blur md:px-8">
          <div className="md:hidden">
            <Logo href="/dashboard" />
          </div>
          <div className="hidden text-sm text-faint md:block">Brightloop console</div>
          <UserMenu user={user} />
        </header>

        {/* Small screens: the sidebar becomes a scrollable strip. */}
        <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 md:hidden print:hidden" aria-label="Main">
          {groups.flatMap((g) => g.items).map((item) => (
            <NavLink key={item.href} {...item} className="shrink-0" />
          ))}
        </nav>

        <main className="flex-1 px-4 py-8 md:px-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
