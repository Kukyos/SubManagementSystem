import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/sales/action-button";
import { PaymentForm, PrintButton } from "@/components/sales/payment-form";
import { Timeline } from "@/components/sales/timeline";
import { Logo } from "@/components/brand/logo";
import { InvoiceBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { date, money } from "@/lib/format";
import { today } from "@/lib/forms";
import { invoiceDisplayStatus, methodLabel } from "@/lib/status";
import { requireRole } from "@/services/auth";
import { uuid } from "@/services/catalogue";
import { setInvoiceStatus } from "@/services/invoice-actions";
import { getInvoice } from "@/services/invoices";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = uuid.test(id) ? await getInvoice(id) : null;
  return { title: invoice?.number ?? "Invoice" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin", "staff");
  const { id } = await params;
  if (!uuid.test(id)) notFound();
  const inv = await getInvoice(id);
  if (!inv) notFound();

  const due = Math.round((Number(inv.total) - Number(inv.amount_paid)) * 100) / 100;
  const display = invoiceDisplayStatus(inv.status, inv.due_date);

  return (
    <>
      <p className="mb-4 text-sm print:hidden">
        <Link href="/invoices" className="text-muted hover:text-fg">
          ← Invoices
        </Link>
      </p>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Invoice"
          title={inv.number}
          description={
            <>
              <Link href={`/customers/${inv.customer.id}`} className="text-fg hover:text-accent-hover">
                {inv.customer.name}
              </Link>
              {inv.subscription && (
                <>
                  {" · "}
                  <Link href={`/subscriptions/${inv.subscription.id}`} className="hover:text-fg">
                    {inv.subscription.number}
                  </Link>
                </>
              )}
            </>
          }
          actions={<InvoiceBadge status={display} />}
        />
        <Card className="mb-6 p-5">
          <div className="flex flex-wrap items-start gap-2">
            {inv.status === "draft" && (
              <ActionButton action={setInvoiceStatus} fields={{ id: inv.id, status: "confirmed" }} label="Confirm" busy="Confirming…" variant="primary" />
            )}
            {(inv.status === "draft" || (inv.status === "confirmed" && Number(inv.amount_paid) === 0)) && (
              <ActionButton action={setInvoiceStatus} fields={{ id: inv.id, status: "cancelled" }} label="Cancel invoice" busy="Cancelling…" variant="danger" />
            )}
            <PrintButton />
            <p className="w-full text-xs text-faint">
              {inv.status === "draft"
                ? "Drafts can still change. Confirming locks the lines and starts the payment clock."
                : inv.status === "cancelled"
                  ? "Cancelled. That period can be billed again."
                  : inv.status === "paid"
                    ? `Paid in full on ${date(inv.paid_at)}.`
                    : Number(inv.amount_paid) > 0
                      ? "Part paid, so it can't be cancelled."
                      : "Waiting for payment."}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start print:block">
        {/* The document itself: this is what prints. */}
        <Card className="p-6 sm:p-8 print:border-0 print:bg-white print:p-0 print:text-black">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <Logo />
              <p className="mt-3 text-xs leading-relaxed text-muted print:text-neutral-600">
                Brightloop Software Pvt. Ltd.
                <br />
                GSTIN 33AAKCB4821L1Z9
              </p>
            </div>
            <div className="text-right">
              <p className="eyebrow print:text-neutral-500">Tax invoice</p>
              <p className="tabular mt-1 text-xl">{inv.number}</p>
              <p className="mt-1 hidden text-sm print:block">{display === "overdue" ? "Overdue" : inv.status[0].toUpperCase() + inv.status.slice(1)}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-faint print:text-neutral-500">Billed to</p>
              <p className="mt-1 font-medium">{inv.customer.name}</p>
              <p className="text-muted print:text-neutral-700">
                {[inv.customer.company, inv.customer.address, inv.customer.city].filter(Boolean).join(", ")}
              </p>
              {inv.customer.tax_number && <p className="text-muted print:text-neutral-700">GSTIN {inv.customer.tax_number}</p>}
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:text-right">
              <dt className="text-faint print:text-neutral-500">Invoice date</dt>
              <dd>{date(inv.invoice_date)}</dd>
              <dt className="text-faint print:text-neutral-500">Due</dt>
              <dd className={display === "overdue" ? "text-pink" : ""}>{date(inv.due_date)}</dd>
              {inv.period_start && (
                <>
                  <dt className="text-faint print:text-neutral-500">Period</dt>
                  <dd>
                    {date(inv.period_start)} – {date(inv.period_end)}
                  </dd>
                </>
              )}
            </dl>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs text-muted print:border-neutral-300 print:text-neutral-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Unit</th>
                  <th className="px-3 py-2 text-right font-medium">Discount</th>
                  <th className="px-3 py-2 text-right font-medium">Tax</th>
                  <th className="py-2 pl-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line print:divide-neutral-200">
                {inv.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-3 pr-3">{l.description}</td>
                    <td className="tabular px-3 py-3 text-right">{Number(l.quantity)}</td>
                    <td className="tabular px-3 py-3 text-right">{money(l.unit_price)}</td>
                    <td className="tabular px-3 py-3 text-right">{Number(l.discount_amount) > 0 ? `−${money(l.discount_amount)}` : "—"}</td>
                    <td className="tabular px-3 py-3 text-right">
                      {money(l.tax_amount)}
                      <span className="block text-xs text-faint print:text-neutral-500">{Number(l.tax_rate)}% GST</span>
                    </td>
                    <td className="tabular py-3 pl-3 text-right">{money(l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="ml-auto mt-6 grid max-w-xs grid-cols-2 gap-y-1.5 text-sm">
            <dt className="text-muted print:text-neutral-600">Subtotal</dt>
            <dd className="tabular text-right">{money(inv.subtotal)}</dd>
            {Number(inv.discount_total) > 0 && (
              <>
                <dt className="text-muted print:text-neutral-600">Discount{inv.discount && ` (${inv.discount})`}</dt>
                <dd className="tabular text-right">−{money(inv.discount_total)}</dd>
              </>
            )}
            <dt className="text-muted print:text-neutral-600">GST</dt>
            <dd className="tabular text-right">{money(inv.tax_total)}</dd>
            <dt className="border-t border-line pt-2 font-medium print:border-neutral-300">Total</dt>
            <dd className="tabular border-t border-line pt-2 text-right text-lg print:border-neutral-300">{money(inv.total)}</dd>
            {Number(inv.amount_paid) > 0 && (
              <>
                <dt className="text-muted print:text-neutral-600">Paid</dt>
                <dd className="tabular text-right text-teal print:text-black">−{money(inv.amount_paid)}</dd>
                <dt className="font-medium">Balance due</dt>
                <dd className="tabular text-right font-medium">{money(due)}</dd>
              </>
            )}
          </dl>
          {inv.notes && <p className="mt-6 text-sm text-muted print:text-neutral-700">{inv.notes}</p>}
        </Card>

        <div className="space-y-6 print:hidden">
          {inv.status === "confirmed" && due > 0 && (
            <Card>
              <CardHeader title="Record a payment" action={<span className="tabular text-xs text-faint">{money(due)} due</span>} />
              <PaymentForm invoiceId={inv.id} due={due} today={today()} />
            </Card>
          )}

          <Card>
            <CardHeader title="Payments" />
            {inv.payments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">
                {inv.status === "draft" ? "Confirm the invoice before recording payments." : "Nothing received yet."}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {inv.payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                    <span>
                      {methodLabel[p.method]}
                      <span className="block text-xs text-faint">
                        {date(p.paid_on)}
                        {p.reference && ` · ${p.reference}`}
                        {p.recordedBy && ` · ${p.recordedBy}`}
                      </span>
                      {p.note && <span className="block text-xs text-muted">{p.note}</span>}
                    </span>
                    <span className="tabular">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Timeline" />
            <Timeline entries={inv.timeline} entity="invoices" />
          </Card>
        </div>
      </div>
    </>
  );
}
