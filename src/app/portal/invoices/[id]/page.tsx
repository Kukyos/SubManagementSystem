import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/sales/invoice-document";
import { PrintButton } from "@/components/sales/payment-form";
import { InvoiceBadge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { date, money } from "@/lib/format";
import { invoiceDisplayStatus, methodLabel } from "@/lib/status";
import { requireRole } from "@/services/auth";
import { uuid } from "@/services/catalogue";
import { getInvoice } from "@/services/invoices";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = uuid.test(id) ? await getInvoice(id) : null;
  return { title: invoice?.number ?? "Invoice" };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("customer");
  const { id } = await params;
  const { welcome } = await searchParams;
  if (!uuid.test(id)) notFound();
  // RLS returns only the customer's own invoices; drafts aren't final yet, so they stay hidden.
  const inv = await getInvoice(id);
  if (!inv || inv.status === "draft") notFound();

  const due = Math.round((Number(inv.total) - Number(inv.amount_paid)) * 100) / 100;
  const display = invoiceDisplayStatus(inv.status, inv.due_date);

  return (
    <>
      <p className="mb-4 text-sm print:hidden">
        <Link href="/portal/invoices" className="text-muted hover:text-fg">
          ← Invoices
        </Link>
      </p>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Invoice"
          title={inv.number}
          description={inv.subscription ? `${inv.subscription.plan} · ${inv.subscription.number}` : undefined}
          actions={<InvoiceBadge status={display} />}
        />
        {welcome && (
          <p role="status" className="mb-6 rounded-card border border-teal/30 bg-teal/[0.06] px-5 py-4 text-sm text-teal">
            You&apos;re subscribed. Here&apos;s your first invoice.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start print:block">
        <InvoiceDocument inv={inv} />

        <div className="space-y-6 print:hidden">
          <Card className="p-5">
            {inv.status === "confirmed" && due > 0 ? (
              <>
                <p className="text-xs text-faint">Balance due{display === "overdue" ? ", overdue" : ""}</p>
                <p className={`tabular mt-1 text-3xl font-light ${display === "overdue" ? "text-pink" : ""}`}>{money(due)}</p>
                <p className="mt-1 text-xs text-muted">Due {date(inv.due_date)}</p>
                <p id="pay" className="mt-4 text-sm text-muted">
                  Online payment is coming soon. Until then, pay by bank transfer or UPI quoting {inv.number}.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">
                {inv.status === "paid" ? `Paid in full on ${date(inv.paid_at)}. Thank you.` : "This invoice was cancelled. Nothing to pay."}
              </p>
            )}
            <div className="mt-4">
              <PrintButton />
            </div>
          </Card>

          {inv.payments.length > 0 && (
            <Card>
              <CardHeader title="Payments" />
              <ul className="divide-y divide-line">
                {inv.payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                    <span>
                      {methodLabel[p.method]}
                      <span className="block text-xs text-faint">
                        {date(p.paid_on)}
                        {p.reference && ` · ${p.reference}`}
                      </span>
                    </span>
                    <span className="tabular">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
