import Link from "next/link";
import { notFound } from "next/navigation";
import { TemplateForm } from "@/components/catalogue/template-form";
import { AddLineForm } from "@/components/sales/subscription-forms";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { money } from "@/lib/format";
import { requireRole } from "@/services/auth";
import { getTemplate, listPlans, listProductOptions, listVariantOptions, uuid, type TemplateLineRow } from "@/services/catalogue";
import { addTemplateLine, removeTemplateLine } from "@/services/catalogue-actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") return { title: "New template" };
  const template = uuid.test(id) ? await getTemplate(id) : null;
  return { title: template?.name ?? "Template" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const user = isNew ? await requireRole("admin") : await requireRole("admin", "staff");
  if (!isNew && !uuid.test(id)) notFound();

  const [template, plans, products, variants] = await Promise.all([
    isNew ? null : getTemplate(id),
    listPlans({ pageSize: 200, show: "all" }),
    listProductOptions(),
    listVariantOptions(),
  ]);
  if (!isNew && !template) notFound();
  const isAdmin = user.role === "admin";
  const plan = plans.rows.find((p) => p.id === template?.plan_id);
  const choosable = plans.rows.filter((p) => p.is_active || p.id === template?.plan_id);
  // A blank price follows the catalogue: the plan price for its own product, list price otherwise.
  const unit = (l: TemplateLineRow) =>
    l.unit_price ?? (plan?.product_id === l.product_id ? Number(plan.price) : l.listPrice) + l.extra;
  const total = template?.lines.reduce((sum, l) => sum + unit(l) * Number(l.quantity), 0) ?? 0;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/templates" className="text-muted hover:text-fg">
          ← Quotation templates
        </Link>
      </p>
      <PageHeader
        eyebrow="Sales"
        title={template?.name ?? "New template"}
        description={!isAdmin && "Only an admin can change templates."}
        actions={template && <ButtonLink href={`/subscriptions/new?template=${template.id}`}>New subscription from this</ButtonLink>}
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader title="Template" />
          <TemplateForm template={template} plans={choosable} readOnly={!isAdmin} />
        </Card>

        {template && (
          <Card>
            <CardHeader title="Lines" action={<span className="tabular text-xs text-muted">{money(total)} per cycle, before tax</span>} />
            {template.lines.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No lines. Subscriptions made from this start empty.</p>
            ) : (
              <ul className="divide-y divide-line">
                {template.lines.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 flex-1">
                      {l.product}
                      <span className="block text-xs text-faint">
                        {[l.variant, l.unit_price === null ? "catalogue price" : "fixed price"].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="tabular text-muted">
                      {Number(l.quantity)} × {money(unit(l))}
                    </span>
                    {isAdmin && (
                      <form action={removeTemplateLine.bind(null, l.id, template.id)}>
                        <button className="text-xs text-faint hover:text-pink" aria-label={`Remove ${l.product}`}>
                          Remove
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {isAdmin && (
              <AddLineForm fields={{ templateId: template.id }} products={products} variants={variants} lineAction={addTemplateLine} withPrice />
            )}
          </Card>
        )}
      </div>
    </>
  );
}
