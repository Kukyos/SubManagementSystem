import { Logo } from "@/components/brand/logo";
import { NavLink } from "@/components/layout/nav-link";
import { portalNav } from "@/components/layout/nav-config";
import { UserMenu } from "@/components/layout/user-menu";
import { requireRole } from "@/services/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("customer");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          <Logo href="/portal" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Portal">
            {portalNav.map((item) => (
              <NavLink key={item.href} {...item} exact={item.href === "/portal"} />
            ))}
          </nav>
          <UserMenu user={user} />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden" aria-label="Portal">
          {portalNav.map((item) => (
            <NavLink key={item.href} {...item} exact={item.href === "/portal"} className="shrink-0" />
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">{children}</main>
    </div>
  );
}
