import Link from "next/link";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { date, money } from "@/lib/format";
import { today } from "@/lib/forms";
import { requireRole } from "@/services/auth";
import { listDiscounts, type DiscountRow, type ProductQuery } from "@/services/catalogue";

export const metadata = { title: "Discounts" };

const pageSize = 20;

// Whether the billing run would use it today.
function liveness(d: DiscountRow, now: string) {
  if (!d.is_active) return { label: "Off", tone: "text-faint" };
  if (d.starts_on && d.starts_on > now) return { label: `From ${date(d.starts_on)}`, tone: "text-amber" };
  if (d.ends_on && d.ends_on < now) return { label: "Ended", tone: "text-faint" };
  if (d.usage_limit && d.times_used >= d.usage_limit) return { label: "Used up", tone: "text-faint" };
  return { label: "Live", tone: "text-teal" };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireRole("admin", "staff");
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const show = (["active", "archived", "all"].includes(params.show ?? "") ? params.show : "active") as ProductQuery["show"];
  const page = Math.max(1, Number(params.page) || 1);
  const { rows, total } = await listDiscounts({ page, pageSize, search, show });
  const isAdmin = user.role === "admin";
  const now = today();

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Discounts"
        description="Discount rules that apply themselves to the next invoice."
        actions={isAdmin && <ButtonLink href="/discounts/new">New discount</ButtonLink>}
      />

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <Input name="q" defaultValue={search} placeholder="Search by name or code" aria-label="Search discounts" className="max-w-xs" />
        <Select name="show" defaultValue={show} aria-label="Which discounts" className="!w-40">
          <option value="active">Active</option>
          <option value="archived">Switched off</option>
          <option value="all">All</option>
        </Select>
        <button className={buttonClass({ variant: "secondary" })}>Filter</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={search ? `No discounts match “${search}”` : "No discounts yet"}
          body={isAdmin ? "Make one for a product, or one staff can attach to a subscription." : "An admin adds discounts here."}
          action={isAdmin && !search && <ButtonLink href="/discounts/new" size="sm">New discount</ButtonLink>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Applies to</th>
                <th className="px-5 py-3 font-medium">Window</th>
                <th className="px-5 py-3 text-right font-medium">Used</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((d) => {
                const live = liveness(d, now);
                return (
                  <tr key={d.id} className="hover:bg-ink/[0.02]">
                    <td className="px-5 py-3">
                      <Link href={`/discounts/${d.id}`} className="font-medium hover:text-accent-hover">
                        {d.name}
                      </Link>
                      {d.code && <span className="block font-mono text-xs text-faint">{d.code}</span>}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {d.scope === "products"
                        ? `${d.productCount} product${d.productCount === 1 ? "" : "s"}`
                        : `${d.subscriptionCount} subscription${d.subscriptionCount === 1 ? "" : "s"}`}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {d.starts_on || d.ends_on ? `${d.starts_on ? date(d.starts_on) : "Now"} – ${d.ends_on ? date(d.ends_on) : "open"}` : "Always"}
                    </td>
                    <td className="tabular px-5 py-3 text-right text-muted">
                      {d.times_used}
                      {d.usage_limit ? ` / ${d.usage_limit}` : ""}
                    </td>
                    <td className={`px-5 py-3 text-xs font-medium ${live.tone}`}>{live.label}</td>
                    <td className="tabular px-5 py-3 text-right">{d.type === "percent" ? `${Number(d.value)}%` : money(d.value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Pager path="/discounts" params={{ q: search, show }} page={page} pageSize={pageSize} total={total} noun="discounts" />
    </>
  );
}
