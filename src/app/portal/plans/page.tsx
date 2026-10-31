import { SubscribeForm } from "@/components/portal/portal-forms";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { cycle, money } from "@/lib/format";
import { requireRole } from "@/services/auth";
import { listPortalPlans } from "@/services/portal";

export const metadata = { title: "Plans" };

const unit = { daily: "day", weekly: "week", monthly: "month", yearly: "year" } as const;

export default async function Page() {
  await requireRole("customer");
  const plans = await listPortalPlans();

  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title="Plans"
        description="Subscribe in one step. It starts today and your first invoice is ready to pay straight away."
      />

      {plans.length === 0 ? (
        <EmptyState
          title="No plans open right now"
          body="Check back soon, or ask our team for a quotation."
          action={<ButtonLink href="/portal" size="sm" variant="secondary">Back to overview</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const per = p.billing_interval === 1 ? `per ${unit[p.billing_period]}` : cycle(p.billing_period, p.billing_interval).toLowerCase();
            return (
              <Card key={p.id} className="flex flex-col">
                <div className="flex-1 p-5">
                  <p className="eyebrow">{p.product?.name}</p>
                  <h2 className="mt-2 text-lg">{p.name}</h2>
                  <p className="mt-3">
                    <span className="tabular text-3xl font-light">{money(p.price)}</span>
                    <span className="ml-1.5 text-sm text-muted">{per}</span>
                  </p>
                  <p className="mt-1 text-xs text-faint">per seat, before GST</p>
                  {(p.description || p.product?.notes) && <p className="mt-4 text-sm text-muted">{p.description || p.product?.notes}</p>}
                  <ul className="mt-4 flex flex-wrap gap-1.5 text-xs text-muted">
                    {[p.pausable && "Pause any time", p.closable && "Cancel any time", p.renewable && "Renewable"].filter(Boolean).map((t) => (
                      <li key={t as string} className="rounded-full border border-line px-2.5 py-0.5">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-line p-5">
                  <SubscribeForm planId={p.id} price={Number(p.price)} minQuantity={p.min_quantity} taxRate={p.taxRate} variants={p.variants} per={per} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
