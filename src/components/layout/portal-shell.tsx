import { Logo } from "@/components/brand/logo";
import { ShardField } from "@/components/landing/shard-field";
import { NavLink } from "@/components/layout/nav-link";
import { portalNav } from "@/components/layout/nav-config";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import type { Theme } from "@/lib/theme";
import { shell } from "@/components/layout/shell";
import { cn } from "@/lib/format";
import type { CurrentUser } from "@/services/auth";

export function PortalShell({ user, children, theme }: { user: CurrentUser; theme: Theme; children: React.ReactNode }) {
  return (
    <div data-shell data-theme={theme} className="bg-bg text-fg min-h-screen">
      {/* the landing's floating shards, without the loop */}
      <div className="print:hidden">
        <ShardField ring={false} />
      </div>
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
          <div className="flex items-center gap-2">
            <ThemeToggle initial={theme} />
            <UserMenu user={user} />
          </div>
        </div>
        <nav className={cn(shell, "flex gap-1 overflow-x-auto pb-2 md:hidden")} aria-label="Portal">
          {portalNav.map((item) => (
            <NavLink key={item.href} {...item} exact={item.href === "/portal"} className="shrink-0" />
          ))}
        </nav>
      </header>
      <main className={cn(shell, "relative z-10 py-10")}>{children}</main>
    </div>
  );
}
