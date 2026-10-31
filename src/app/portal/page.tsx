import Link from "next/link";
import { ActionButton } from "@/components/sales/action-button";
import { InvoiceBadge, SubscriptionBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { cycle, date, money } from "@/lib/format";
import { invoiceDisplayStatus } from "@/lib/status";
import { requireRole } from "@/services/auth";
import { myOverview, type MySubscription } from "@/services/portal";
import { subscriptionAction } from "@/services/portal-actions";

export const metadata = { title: "Overview" };

export default async function Page() {
  const user = await requireRole("customer");
  const o = await myOverview();
  const current = o.subscriptions.filter((s) => s.status !== "closed");
  const past = o.subscriptions.filter((s) => s.status === "closed");
  const nextBill = current
    .filter((s) => s.status === "active" && s.next_invoice_date)
    .map((s) => s.next_invoice_date!)
    .sort()[0];

  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title={`Hello, ${user.fullName.split(" ")[0]}`}
        description="Your subscriptions, open invoices and balance."
        actions={<ButtonLink href="/portal/plans">Browse plans</ButtonLink>}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Balance due"
          value={money(o.balance)}
          hint={o.overdue > 0 ? <span className="text-pink">{money(o.overdue)} of it is overdue</span> : o.balance > 0 ? "Nothing overdue" : "You're all paid up"}
        />
        <Stat label="Active subscriptions" value={current.filter((s) => s.status === "active").length} hint={`${current.length} in all, not counting closed`} />
        <Stat label="Next invoice" value={nextBill ? date(nextBill) : "—"} hint={nextBill ? "Issued on the morning it's due" : "Nothing scheduled"} />
      </div>

      {o.openInvoices.length > 0 && (
        <Card className="mb-8">
          <CardHeader title="To pay" action={<Link href="/portal/invoices" className="text-xs text-muted hover:text-fg">All invoices →</Link>} />
          <ul className="divide-y divide-line">
            {o.openInvoices.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <Link href={`/portal/invoices/${i.id}`} className="tabular font-medium hover:text-accent-hover">
                  {i.number}
                </Link>
                <InvoiceBadge status={invoiceDisplayStatus(i.status, i.due_date)} />
                <span className="flex-1 text-muted">Due {date(i.due_date)}</span>
                <span className="tabular">{money(Number(i.total) - Number(i.amount_paid))}</span>
                <ButtonLink href={`/portal/invoices/${i.id}`} size="sm" variant="secondary">
                  View and pay
                </ButtonLink>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <h2 className="mb-3 text-sm font-medium">Subscriptions</h2>
      {current.length === 0 ? (
        <EmptyState
          title="No subscriptions yet"
          body="Pick a plan and you're set up in a minute. The first invoice comes straight away."
          action={<ButtonLink href="/portal/plans" size="sm">Browse plans</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {current.map((s) => (
            <SubscriptionCard key={s.id} sub={s} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-medium text-muted">Closed</h2>
          <Card>
            <ul className="divide-y divide-line">
              {past.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="tabular text-muted">{s.number}</span>
                  <span className="flex-1">{s.plan.name}</span>
                  <span className="text-xs text-faint">
                    {s.close_reason ?? "Closed"}
                    {s.closed_at && ` · ${date(s.closed_at)}`}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}

function SubscriptionCard({ sub }: { sub: MySubscription }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="font-medium">{sub.plan.name}</p>
          <p className="tabular text-xs text-faint">
            {sub.number} · {cycle(sub.plan.billing_period, sub.plan.billing_interval)}
          </p>
        </div>
        <SubscriptionBadge status={sub.status} />
      </div>
      <ul className="space-y-1 px-5 py-3 text-sm">
        {sub.lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="text-muted">
              {l.description} <span className="text-faint">× {l.quantity}</span>
            </span>
            <span className="tabular">{money(l.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-5 py-3 text-xs text-muted">
        {sub.status === "active" && sub.next_invoice_date && <>Next invoice {date(sub.next_invoice_date)}. </>}
        {sub.status === "paused" && "Paused: nothing is billed until you resume. "}
        {sub.status === "quotation" && sub.quote_valid_until && <>Quotation, valid until {date(sub.quote_valid_until)}. Our team will confirm it with you. </>}
        {sub.status === "confirmed" && "Confirmed. Billing starts on the start date. "}
        {sub.expiry_date ? <>Runs until {date(sub.expiry_date)}.</> : "Runs until you cancel."}
      </p>
      {(sub.status === "active" || sub.status === "paused") && (
        <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
          {sub.status === "active" && sub.plan.pausable && (
            <ActionButton action={subscriptionAction} fields={{ id: sub.id, action: "pause" }} label="Pause" busy="Pausing…" />
          )}
          {sub.status === "paused" && (
            <ActionButton action={subscriptionAction} fields={{ id: sub.id, action: "resume" }} label="Resume" busy="Resuming…" variant="primary" />
          )}
          {sub.plan.closable && (
            // A second click to confirm: cancelling stops billing and can't be undone from here.
            <details className="group w-full">
              <summary className="cursor-pointer list-none text-xs text-faint hover:text-pink group-open:text-pink">Cancel subscription…</summary>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted">No more invoices after today. Open invoices still need paying.</span>
                <ActionButton action={subscriptionAction} fields={{ id: sub.id, action: "cancel" }} label="Yes, cancel it" busy="Cancelling…" variant="danger" />
              </div>
            </details>
          )}
        </div>
      )}
    </Card>
  );
}
