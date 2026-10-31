import Link from "next/link";
import { StatusTabs } from "@/components/sales/status-tabs";
import { SubscriptionBadge } from "@/components/ui/badge";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { ExportLink } from "@/components/ui/export-link";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { date, money } from "@/lib/format";
import { subscriptionStatus } from "@/lib/status";
import { requireRole } from "@/services/auth";
import { listPlans, uuid } from "@/services/catalogue";
import { listSubscriptions, subscriptionCounts, subscriptionStatuses } from "@/services/subscriptions";
import type { SubscriptionStatus } from "@/types/models";

export const metadata = { title: "Subscriptions" };

const pageSize = 25;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole("admin", "staff");
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const status = subscriptionStatuses.includes(params.status as SubscriptionStatus) ? (params.status as SubscriptionStatus) : undefined;
  const planId = params.plan && uuid.test(params.plan) ? params.plan : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ rows, total }, counts, plans] = await Promise.all([
    listSubscriptions({ page, pageSize, search, status, planId }),
    subscriptionCounts(),
    listPlans({ pageSize: 200, show: "all" }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Subscriptions"
        description="Every deal from first draft to closed. Click a status to see just those."
        actions={
          <>
            <ExportLink list="subscriptions" params={{ q: search, status, plan: planId }} />
            <ButtonLink href="/subscriptions/new">New subscription</ButtonLink>
          </>
        }
      />

      <StatusTabs
        path="/subscriptions"
        current={status}
        params={{ q: search, plan: planId }}
        tabs={subscriptionStatuses.map((s) => ({ value: s, label: subscriptionStatus[s].label, count: counts[s], dot: subscriptionStatus[s].dot }))}
      />

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <Input name="q" defaultValue={search} placeholder="Customer name or SUB-00042" aria-label="Search subscriptions" className="max-w-xs" />
        <Select name="plan" defaultValue={planId ?? ""} aria-label="Plan" className="!w-56">
          <option value="">Every plan</option>
          {plans.rows.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <button className={buttonClass({ variant: "secondary" })}>Filter</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={search || planId ? "Nothing matches those filters" : status ? `No ${subscriptionStatus[status].label.toLowerCase()} subscriptions` : "No subscriptions yet"}
          body={search || planId ? "Try a shorter search or another plan." : "Start one from a customer, or here."}
          action={!search && !planId && <ButtonLink href="/subscriptions/new" size="sm">New subscription</ButtonLink>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Next</th>
                <th className="px-5 py-3 text-right font-medium">Per cycle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-ink/[0.02]">
                  <td className="px-5 py-3">
                    <Link href={`/subscriptions/${s.id}`} className="tabular font-medium hover:text-accent-hover">
                      {s.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    {s.customer ? (
                      <Link href={`/customers/${s.customer.id}`} className="hover:text-accent-hover">
                        {s.customer.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {s.customer?.company && <span className="block text-xs text-faint">{s.customer.company}</span>}
                  </td>
                  <td className="px-5 py-3 text-muted">{s.plan}</td>
                  <td className="px-5 py-3">
                    <SubscriptionBadge status={s.status} />
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {s.status === "active"
                      ? `Bills ${date(s.next_invoice_date)}`
                      : s.status === "quotation"
                        ? `Valid to ${date(s.quote_valid_until)}`
                        : s.status === "closed"
                          ? `Ended ${date(s.expiry_date)}`
                          : `Starts ${date(s.start_date)}`}
                  </td>
                  <td className="tabular px-5 py-3 text-right">{money(s.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Pager path="/subscriptions" params={{ q: search, status, plan: planId }} page={page} pageSize={pageSize} total={total} noun="subscriptions" />
    </>
  );
}
