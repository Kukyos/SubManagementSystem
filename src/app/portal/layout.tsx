import { PortalShell } from "@/components/layout/portal-shell";
import { getTheme } from "@/lib/theme";
import { requireRole } from "@/services/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("customer");
  return <PortalShell user={user} theme={await getTheme()}>{children}</PortalShell>;
}
