import { Logo } from "@/components/brand/logo";
import { NavLink } from "@/components/layout/nav-link";
import { portalNav } from "@/components/layout/nav-config";
import { UserMenu } from "@/components/layout/user-menu";
import { shell } from "@/components/layout/shell";
import { cn } from "@/lib/format";
import type { CurrentUser } from "@/services/auth";

export function PortalShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur print:hidden">
        <div className={cn(shell, "flex h-16 items-center justify-between gap-4")}>
          <div className="flex items-center gap-8">
            <Logo href="/portal" />
            <nav className="hidden items-center gap-1 md:flex" aria-label="Portal">
              {portalNav.map((item) => (
                <NavLink key={item.href} {...item} exact={item.href === "/portal"} />
              ))}
            </nav>
          </div>
          <UserMenu user={user} />
        </div>
        <nav className={cn(shell, "flex gap-1 overflow-x-auto pb-2 md:hidden")} aria-label="Portal">
          {portalNav.map((item) => (
            <NavLink key={item.href} {...item} exact={item.href === "/portal"} className="shrink-0" />
          ))}
        </nav>
      </header>
      <main className={cn(shell, "py-10")}>{children}</main>
    </div>
  );
}
