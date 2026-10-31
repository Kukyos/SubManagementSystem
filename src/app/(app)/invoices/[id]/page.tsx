import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/sales/action-button";
import { PaymentForm, PrintButton } from "@/components/sales/payment-form";
import { InvoiceDocument } from "@/components/sales/invoice-document";
import { Timeline } from "@/components/sales/timeline";
import { InvoiceBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { date, money } from "@/lib/format";
import { today } from "@/lib/forms";
import { invoiceDisplayStatus, methodLabel } from "@/lib/status";
import { requireRole } from "@/services/auth";
import { uuid } from "@/services/catalogue";
import { sendInvoice, setInvoiceStatus } from "@/services/invoice-actions";
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
            {(inv.status === "confirmed" || inv.status === "paid") && (
              <ActionButton
                action={sendInvoice}
                fields={{ id: inv.id }}
                label={inv.sent_at ? "Send again" : "Email to customer"}
                busy="Sending…"
                variant={inv.sent_at || inv.status === "paid" ? "secondary" : "primary"}
              />
            )}
            <a href={`/invoices/${inv.id}/pdf`} target="_blank" rel="noopener" className={buttonClass({ variant: "secondary", size: "sm" })}>
              PDF
            </a>
            <PrintButton />
            <p className="w-full text-xs text-faint">
              {inv.sent_at && <>Emailed to {inv.customer.email} on {date(inv.sent_at)}. </>}
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
        <InvoiceDocument inv={inv} />

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
