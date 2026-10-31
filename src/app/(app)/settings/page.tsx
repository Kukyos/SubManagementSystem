import { StaffForm } from "@/components/sales/staff-form";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { date } from "@/lib/format";
import { listTeam, requireRole } from "@/services/auth";

export const metadata = { title: "Settings" };

export default async function Page() {
  const user = await requireRole("admin", "staff");
  const team = await listTeam();
  const isAdmin = user.role === "admin";

  return (
    <>
      <PageHeader eyebrow="Admin" title="Settings" description="Who works in the console. Taxes move here next." />

      <Card className="max-w-3xl">
        <CardHeader title="Team" action={<span className="text-xs text-faint">{team.length} people</span>} />
        <ul className="divide-y divide-line">
          {team.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <span>
                {m.full_name}
                {m.id === user.id && <span className="ml-2 text-xs text-faint">You</span>}
                <span className="block text-xs text-faint">{m.email}</span>
              </span>
              <span className="text-right text-xs text-muted">
                {m.role === "admin" ? "Admin" : "Staff"}
                <span className="block text-faint">since {date(m.created_at)}</span>
              </span>
            </li>
          ))}
        </ul>
        {isAdmin ? (
          <StaffForm />
        ) : (
          <p className="border-t border-line px-5 py-4 text-sm text-muted">Only an admin can add staff.</p>
        )}
      </Card>
    </>
  );
}
