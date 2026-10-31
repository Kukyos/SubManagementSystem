import Link from "next/link";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { cycle, date, money } from "@/lib/format";
import { requireRole } from "@/services/auth";
import { listPlans, type ProductQuery } from "@/services/catalogue";

export const metadata = { title: "Plans" };

const pageSize = 20;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireRole("admin", "staff");
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const show = (["active", "archived", "all"].includes(params.show ?? "") ? params.show : "active") as ProductQuery["show"];
  const page = Math.max(1, Number(params.page) || 1);
  const { rows, total } = await listPlans({ page, pageSize, search, show });
  const isAdmin = user.role === "admin";

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Plans"
        description="How often each product bills, at what price, and what customers may do mid-term."
        actions={isAdmin && <ButtonLink href="/plans/new">New plan</ButtonLink>}
      />

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <Input name="q" defaultValue={search} placeholder="Search by name" aria-label="Search plans" className="max-w-xs" />
        <Select name="show" defaultValue={show} aria-label="Which plans" className="w-40">
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </Select>
        <button className={buttonClass({ variant: "secondary" })}>Filter</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={search ? `No plans match “${search}”` : show === "archived" ? "Nothing archived" : "No plans yet"}
          body={search ? "Try a shorter search, or look in All." : isAdmin ? "A plan turns a product into something customers subscribe to." : "An admin adds plans here."}
          action={isAdmin && !search && show !== "archived" && <ButtonLink href="/plans/new" size="sm">New plan</ButtonLink>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Billing</th>
                <th className="px-5 py-3 font-medium">Available</th>
                <th className="px-5 py-3 text-right font-medium">Active subs</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <Link href={`/plans/${p.id}`} className="font-medium hover:text-accent-hover">
                      {p.name}
                    </Link>
                    {!p.is_active && <span className="ml-2 text-xs text-faint">Archived</span>}
                  </td>
                  <td className="px-5 py-3 text-muted">{p.product?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-muted">{cycle(p.billing_period, p.billing_interval)}</td>
                  <td className="px-5 py-3 text-muted">
                    {p.available_from || p.available_until
                      ? `${p.available_from ? date(p.available_from) : "Now"} – ${p.available_until ? date(p.available_until) : "open"}`
                      : "Always"}
                  </td>
                  <td className="tabular px-5 py-3 text-right text-muted">{p.activeCount}</td>
                  <td className="tabular px-5 py-3 text-right">{money(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Pager path="/plans" params={{ q: search, show }} page={page} pageSize={pageSize} total={total} noun="plans" />
    </>
  );
}
