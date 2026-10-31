import Link from "next/link";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { ExportLink } from "@/components/ui/export-link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { money } from "@/lib/format";
import { requireRole } from "@/services/auth";
import { listCustomers } from "@/services/customers";

export const metadata = { title: "Customers" };

const pageSize = 25;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole("admin", "staff");
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const { rows, total } = await listCustomers({ page, pageSize, search });

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Customers"
        description="Billing contacts, their subscriptions and what they owe."
        actions={
          <>
            <ExportLink list="customers" params={{ q: search }} />
            <ButtonLink href="/customers/new">New customer</ButtonLink>
          </>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <Input name="q" defaultValue={search} placeholder="Name, email or company" aria-label="Search customers" className="max-w-xs" />
        <button className={buttonClass({ variant: "secondary" })}>Search</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={search ? `No customers match “${search}”` : "No customers yet"}
          body={search ? "Try part of the name, or the company." : "Add the first one, or they appear here when they sign up on the portal."}
          action={!search && <ButtonLink href="/customers/new" size="sm">New customer</ButtonLink>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">City</th>
                <th className="px-5 py-3 text-right font-medium">Active subs</th>
                <th className="px-5 py-3 text-right font-medium">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <Link href={`/customers/${c.id}`} className="font-medium hover:text-accent-hover">
                      {c.name}
                    </Link>
                    <span className="block text-xs text-faint">{c.email}</span>
                  </td>
                  <td className="px-5 py-3 text-muted">{c.company ?? "—"}</td>
                  <td className="px-5 py-3 text-muted">{c.city ?? "—"}</td>
                  <td className="tabular px-5 py-3 text-right text-muted">{c.activeCount}</td>
                  <td className="tabular px-5 py-3 text-right">
                    {c.outstanding > 0 ? money(c.outstanding) : <span className="text-faint">—</span>}
                    {c.overdue > 0 && <span className="block text-xs text-pink">{money(c.overdue)} overdue</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Pager path="/customers" params={{ q: search }} page={page} pageSize={pageSize} total={total} noun="customers" />
    </>
  );
}
