import { StaffForm } from "@/components/sales/staff-form";
import { TaxRow } from "@/components/settings/tax-form";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { date } from "@/lib/format";
import { listTeam, requireRole } from "@/services/auth";
import { listTaxes } from "@/services/catalogue";

export const metadata = { title: "Settings" };

export default async function Page() {
  const user = await requireRole("admin", "staff");
  const [team, taxes] = await Promise.all([listTeam(), listTaxes()]);
  const isAdmin = user.role === "admin";

  return (
    <>
      <PageHeader eyebrow="Admin" title="Settings" description="Who works in the console, and the taxes invoices charge." />

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

      <Card className="mt-6 max-w-3xl">
        <CardHeader title="Taxes" action={<span className="text-xs text-faint">The default applies to new products</span>} />
        <div className="divide-y divide-line">
          {taxes.map((t) => (
            // Re-keyed on the flags so a default moved by another row shows here too.
            <TaxRow key={`${t.id}-${t.is_default}-${t.is_active}`} tax={t} readOnly={!isAdmin} />
          ))}
          {isAdmin ? (
            <TaxRow readOnly={false} />
          ) : (
            <p className="px-5 py-4 text-sm text-muted">Only an admin can change taxes.</p>
          )}
        </div>
      </Card>
    </>
  );
}
