import Link from "next/link";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { money } from "@/lib/format";
import { requireRole } from "@/services/auth";
import { listProducts, type ProductQuery } from "@/services/catalogue";

export const metadata = { title: "Products" };

const pageSize = 20;
const typeLabel = { service: "Service", goods: "Goods", addon: "Add-on" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireRole("admin", "staff");
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const show = (["active", "archived", "all"].includes(params.show ?? "") ? params.show : "active") as ProductQuery["show"];
  const page = Math.max(1, Number(params.page) || 1);
  const { rows, total } = await listProducts({ page, pageSize, search, show });
  const isAdmin = user.role === "admin";

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="What Brightloop sells, with variants and prices."
        actions={isAdmin && <ButtonLink href="/products/new">New product</ButtonLink>}
      />

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <Input name="q" defaultValue={search} placeholder="Search by name" aria-label="Search products" className="max-w-xs" />
        <Select name="show" defaultValue={show} aria-label="Which products" className="!w-40">
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </Select>
        <button className={buttonClass({ variant: "secondary" })}>Filter</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={search ? `No products match “${search}”` : show === "archived" ? "Nothing archived" : "No products yet"}
          body={search ? "Try a shorter search, or look in All." : isAdmin ? "Add the first thing Brightloop sells." : "An admin adds products here."}
          action={isAdmin && !search && show !== "archived" && <ButtonLink href="/products/new" size="sm">New product</ButtonLink>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Tax</th>
                <th className="px-5 py-3 text-right font-medium">Variants</th>
                <th className="px-5 py-3 text-right font-medium">Cost</th>
                <th className="px-5 py-3 text-right font-medium">Sales price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <Link href={`/products/${p.id}`} className="font-medium hover:text-accent-hover">
                      {p.name}
                    </Link>
                    {!p.is_active && <span className="ml-2 text-xs text-faint">Archived</span>}
                  </td>
                  <td className="px-5 py-3 text-muted">{typeLabel[p.type]}</td>
                  <td className="px-5 py-3 text-muted">{p.tax?.name ?? "—"}</td>
                  <td className="tabular px-5 py-3 text-right text-muted">{p.variantCount || "—"}</td>
                  <td className="tabular px-5 py-3 text-right text-muted">{p.costPrice == null ? "—" : money(p.costPrice)}</td>
                  <td className="tabular px-5 py-3 text-right">{money(p.sales_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Pager path="/products" params={{ q: search, show }} page={page} pageSize={pageSize} total={total} noun="products" />
    </>
  );
}
