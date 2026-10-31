import { ConsoleShell } from "@/components/layout/console-shell";
import { consoleNav } from "@/components/layout/nav-config";
import { requireRole } from "@/services/auth";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin", "staff");
  const groups = consoleNav
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(user.role)) }))
    .filter((g) => g.items.length);

  return (
    <ConsoleShell user={user} groups={groups}>
      {children}
    </ConsoleShell>
  );
}
