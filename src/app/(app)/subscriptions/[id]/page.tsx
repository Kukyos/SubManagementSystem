import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/sales/action-button";
import { AddLineForm, AttachDiscountForm, NewSubscriptionForm } from "@/components/sales/subscription-forms";
import { Timeline } from "@/components/sales/timeline";
import { InvoiceBadge, SubscriptionBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { cycle, date, money } from "@/lib/format";
import { today } from "@/lib/forms";
import { invoiceDisplayStatus, subscriptionStatus } from "@/lib/status";
import { requireRole } from "@/services/auth";
import { listDiscountOptions, listPlans, listProductOptions, listTemplates, listVariantOptions, uuid } from "@/services/catalogue";
import { listCustomerOptions } from "@/services/customers";
import { billNow, detachDiscount, removeLine, renewSubscription, setLineQuantity, setStatus } from "@/services/subscription-actions";
import { getSubscription, type SubscriptionDetail } from "@/services/subscriptions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") return { title: "New subscription" };
  const sub = uuid.test(id) ? await getSubscription(id) : null;
  return { title: sub?.number ?? "Subscription" };
}

const back = (
  <p className="mb-4 text-sm">
    <Link href="/subscriptions" className="text-muted hover:text-fg">
      ← Subscriptions
    </Link>
  </p>
);

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("admin", "staff");
  const { id } = await params;

  if (id === "new") {
    const { customer, template } = await searchParams;
    const [customers, plans, templates] = await Promise.all([listCustomerOptions(), listPlans({ pageSize: 200 }), listTemplates()]);
    return (
      <>
        {back}
        <PageHeader eyebrow="Sales" title="New subscription" description="Starts as a draft. Add lines, send it as a quotation, then confirm and activate." />
        <Card className="max-w-3xl">
          <CardHeader title="Subscription" />
          <NewSubscriptionForm
            customers={customers}
            plans={plans.rows}
            templates={templates}
            customerId={customer}
            templateId={template}
            today={today()}
          />
        </Card>
      </>
    );
  }

  if (!uuid.test(id)) notFound();
  const sub = await getSubscription(id);
  if (!sub) notFound();

  const editable = sub.status !== "closed";
  const [products, variants, discountOptions] = editable
    ? await Promise.all([listProductOptions(), listVariantOptions(), listDiscountOptions()])
    : [[], [], []];
  const attachable = discountOptions.filter((d) => !sub.discounts.some((a) => a.id === d.id));
  const subtotal = sub.lines.reduce((n, l) => n + Number(l.amount), 0);
  const tax = sub.lines.reduce((n, l) => n + (Number(l.amount) * l.taxRate) / 100, 0);
  const qty = sub.lines.reduce((n, l) => n + Number(l.quantity), 0);

  return (
    <>
      {back}
      <PageHeader
        eyebrow={sub.plan.name}
        title={sub.number}
        description={
          <>
            <Link href={`/customers/${sub.customer.id}`} className="text-fg hover:text-accent-hover">
              {sub.customer.name}
            </Link>
            {sub.customer.company && ` · ${sub.customer.company}`}
          </>
        }
        actions={<SubscriptionBadge status={sub.status} />}
      />

      <Pipeline status={sub.status} />

      <Card className="mb-6 p-5">
        {/* Re-keyed on status so one step's message doesn't linger on the next step's buttons. */}
        <div key={sub.status} className="flex flex-wrap items-start gap-2">
          <Actions sub={sub} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="space-y-6">
          <Card className="overflow-x-auto">
            <CardHeader
              title="Lines"
              action={
                <span className="text-xs text-faint">
                  {qty < sub.plan.min_quantity ? <span className="text-amber">Plan needs at least {sub.plan.min_quantity} in total</span> : "Changes apply from the next invoice"}
                </span>
              }
            />
            {sub.lines.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No lines yet. Add the plan&apos;s product below before confirming.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Product</th>
                    <th className="px-5 py-3 font-medium">Qty</th>
                    <th className="px-5 py-3 text-right font-medium">Unit</th>
                    <th className="px-5 py-3 text-right font-medium">Tax</th>
                    <th className="px-5 py-3 text-right font-medium">Amount</th>
                    {editable && <th className="w-px px-5 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sub.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-5 py-3">
                        {l.description || l.product}
                        {l.variant && <span className="block text-xs text-faint">{l.variant}</span>}
                      </td>
                      <td className="px-5 py-3">
                        {editable ? (
                          <form action={setLineQuantity.bind(null, l.id, sub.id)} className="flex items-center gap-1">
                            <Input
                              name="quantity"
                              type="number"
                              min={1}
                              step={1}
                              defaultValue={Number(l.quantity)}
                              aria-label={`Quantity of ${l.product}`}
                              className="tabular h-8 !w-20"
                            />
                            <button className="text-xs text-faint hover:text-fg">Set</button>
                          </form>
                        ) : (
                          <span className="tabular">{Number(l.quantity)}</span>
                        )}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-muted">{money(l.unit_price)}</td>
                      <td className="tabular px-5 py-3 text-right text-muted">{l.taxRate}%</td>
                      <td className="tabular px-5 py-3 text-right">{money(l.amount)}</td>
                      {editable && (
                        <td className="px-5 py-3">
                          <form action={removeLine.bind(null, l.id, sub.id)}>
                            <button className="text-xs text-faint hover:text-pink" aria-label={`Remove ${l.product}`}>
                              Remove
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="text-sm">
                  <tr className="border-t border-line">
                    <td colSpan={4} className="px-5 pt-3 text-right text-muted">Subtotal</td>
                    <td className="tabular px-5 pt-3 text-right">{money(subtotal)}</td>
                    {editable && <td />}
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-5 py-1 text-right text-muted">Tax</td>
                    <td className="tabular px-5 py-1 text-right">{money(tax)}</td>
                    {editable && <td />}
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-5 pb-3 text-right font-medium">
                      Per cycle, before discounts
                    </td>
                    <td className="tabular px-5 pb-3 text-right font-medium">{money(subtotal + tax)}</td>
                    {editable && <td />}
                  </tr>
                </tfoot>
              </table>
            )}
            {editable && <AddLineForm fields={{ subscriptionId: sub.id }} products={products} variants={variants} />}
          </Card>

          <Card className="overflow-x-auto">
            <CardHeader title="Invoices" action={sub.invoices.length > 0 && <span className="text-xs text-faint">Latest {sub.invoices.length}</span>} />
            {sub.invoices.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">
                {sub.status === "active" ? "Nothing billed yet. Bill now, or wait for tonight's run." : "Invoices start once it's active."}
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-line">
                  {sub.invoices.map((i) => (
                    <tr key={i.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <Link href={`/invoices/${i.id}`} className="tabular font-medium hover:text-accent-hover">
                          {i.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {date(i.period_start)} – {date(i.period_end)}
                      </td>
                      <td className="px-5 py-3">
                        <InvoiceBadge status={invoiceDisplayStatus(i.status, i.due_date)} />
                      </td>
                      <td className="tabular px-5 py-3 text-right">{money(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Terms" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 text-sm">
              <Term label="Plan">
                <Link href={`/plans/${sub.plan.id}`} className="hover:text-accent-hover">
                  {sub.plan.name}
                </Link>
              </Term>
              <Term label="Billing">{cycle(sub.plan.billing_period, sub.plan.billing_interval)}</Term>
              <Term label="Starts">{date(sub.start_date)}</Term>
              <Term label="Ends">{sub.expiry_date ? date(sub.expiry_date) : "Open-ended"}</Term>
              <Term label="Next invoice">{sub.status === "active" ? date(sub.next_invoice_date) : "—"}</Term>
              <Term label="Payment terms">{sub.payment_terms === "immediate" ? "On receipt" : sub.payment_terms.replace("net_", "") + " days"}</Term>
              {sub.quote_valid_until && <Term label="Quote valid to">{date(sub.quote_valid_until)}</Term>}
              <Term label="Salesperson">{sub.salesperson ?? "—"}</Term>
              {sub.close_reason && <Term label="Closed because">{sub.close_reason}</Term>}
              <Term label="Rules">
                {[sub.plan.pausable && "pausable", sub.plan.closable && "closable early", sub.plan.renewable && "renewable", sub.plan.auto_close && "closes on expiry"]
                  .filter(Boolean)
                  .join(", ") || "none"}
              </Term>
            </dl>
            {sub.notes && <p className="border-t border-line px-5 py-4 text-sm text-muted">{sub.notes}</p>}
          </Card>

          <Card>
            <CardHeader title="Discounts" action={<span className="text-xs text-faint">Best live one applies</span>} />
            {sub.discounts.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">None attached. Product discounts still apply by themselves.</p>
            ) : (
              <ul className="divide-y divide-line">
                {sub.discounts.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <Link href={`/discounts/${d.id}`} className="hover:text-accent-hover">
                        {d.name}
                      </Link>
                      <span className="block text-xs text-faint">
                        {[d.code, d.ends_on && `until ${date(d.ends_on)}`, d.usage_limit && `${d.times_used} of ${d.usage_limit} used`, !d.is_active && "switched off"]
                          .filter(Boolean)
                          .join(" · ") || "No end date"}
                      </span>
                    </span>
                    <span className="tabular text-muted">{d.type === "percent" ? `${Number(d.value)}%` : money(d.value)}</span>
                    {editable && (
                      <form action={detachDiscount.bind(null, sub.id, d.id)}>
                        <button className="text-xs text-faint hover:text-pink" aria-label={`Detach ${d.name}`}>
                          Detach
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {editable && attachable.length > 0 && <AttachDiscountForm subscriptionId={sub.id} discounts={attachable} />}
          </Card>

          <Card>
            <CardHeader title="Timeline" />
            <Timeline entries={sub.timeline} entity="subscriptions" />
          </Card>
        </div>
      </div>
    </>
  );
}

function Term({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-faint">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

const stages = ["draft", "quotation", "confirmed", "active", "closed"] as const;

// Where this subscription sits on the way from draft to closed.
function Pipeline({ status }: { status: SubscriptionDetail["status"] }) {
  const at = status === "paused" ? 3 : stages.indexOf(status);
  return (
    <ol className="mb-6 grid grid-cols-5 gap-1" aria-label="Lifecycle">
      {stages.map((s, i) => {
        const style = subscriptionStatus[status === "paused" && s === "active" ? "paused" : s];
        return (
          <li key={s} aria-current={i === at ? "step" : undefined} className="text-xs">
            <span className="block h-1 rounded-full" style={{ background: i <= at ? style.hex : "rgba(255,255,255,0.08)" }} />
            <span className={`mt-2 block ${i === at ? "text-fg" : "text-faint"}`}>{style.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Actions({ sub }: { sub: SubscriptionDetail }) {
  const f = (status: string) => ({ id: sub.id, status });
  // Mirrors the trigger: a non-closable plan only closes once its end date has come.
  const canClose = sub.plan.closable || (!!sub.expiry_date && sub.expiry_date <= today());
  switch (sub.status) {
    case "draft":
      return (
        <>
          <ActionButton action={setStatus} fields={f("quotation")} label="Send as quotation" busy="Sending…" variant="primary" />
          <ActionButton action={setStatus} fields={f("confirmed")} label="Confirm" busy="Confirming…" />
          <ActionButton action={setStatus} fields={f("closed")} label="Cancel" busy="Cancelling…" variant="danger" askReason="Why is it cancelled?" />
        </>
      );
    case "quotation":
      return (
        <>
          <ActionButton action={setStatus} fields={f("confirmed")} label="Customer accepted: confirm" busy="Confirming…" variant="primary" />
          <ActionButton action={setStatus} fields={f("draft")} label="Back to draft" busy="Moving…" />
          <ActionButton action={setStatus} fields={f("closed")} label="Declined" busy="Closing…" variant="danger" askReason="Why did they decline?" />
        </>
      );
    case "confirmed":
      return (
        <>
          <ActionButton action={setStatus} fields={f("active")} label="Activate" busy="Activating…" variant="primary" />
          <ActionButton action={setStatus} fields={f("closed")} label="Cancel" busy="Cancelling…" variant="danger" askReason="Why is it cancelled?" />
        </>
      );
    case "active":
      return (
        <>
          <ActionButton action={billNow} fields={{ id: sub.id }} label="Bill now" busy="Billing…" variant="primary" />
          {sub.plan.pausable && <ActionButton action={setStatus} fields={f("paused")} label="Pause" busy="Pausing…" />}
          {canClose && <ActionButton action={setStatus} fields={f("closed")} label="Close" busy="Closing…" variant="danger" askReason="Why is it closing?" />}
        </>
      );
    case "paused":
      return (
        <>
          <ActionButton action={setStatus} fields={f("active")} label="Resume" busy="Resuming…" variant="primary" />
          {canClose && <ActionButton action={setStatus} fields={f("closed")} label="Close" busy="Closing…" variant="danger" askReason="Why is it closing?" />}
        </>
      );
    case "closed":
      return sub.plan.renewable ? (
        <ActionButton action={renewSubscription} fields={{ id: sub.id }} label="Renew" busy="Renewing…" variant="primary" />
      ) : (
        <p className="text-sm text-muted">Closed. This plan isn&apos;t renewable; start a new subscription instead.</p>
      );
  }
}
