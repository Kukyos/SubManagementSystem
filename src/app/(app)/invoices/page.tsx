import Link from "next/link";
import { StatusTabs } from "@/components/sales/status-tabs";
import { InvoiceBadge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { ExportLink } from "@/components/ui/export-link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { date, money } from "@/lib/format";
import { invoiceDisplayStatus, invoiceStatus, type InvoiceDisplayStatus } from "@/lib/status";
import { requireRole } from "@/services/auth";
import { uuid } from "@/services/catalogue";
import { confirmDrafts } from "@/services/invoice-actions";
import { invoiceCounts, invoiceFilters, listInvoices } from "@/services/invoices";

export const metadata = { title: "Invoices" };

const pageSize = 25;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole("admin", "staff");
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const status = invoiceFilters.includes(params.status as InvoiceDisplayStatus) ? (params.status as InvoiceDisplayStatus) : undefined;
  const customerId = params.customer && uuid.test(params.customer) ? params.customer : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ rows, total }, counts] = await Promise.all([
    listInvoices({ page, pageSize, search, status, customerId }),
    invoiceCounts(),
  ]);
  const drafts = rows.filter((r) => r.status === "draft").map((r) => r.id);

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        description="Created by the billing run as drafts. Confirm them to send, then record what comes in."
        actions={
          <>
            <ExportLink list="invoices" params={{ q: search, status, customer: customerId }} />
            {drafts.length > 0 && (
              <form action={confirmDrafts.bind(null, drafts)}>
                <Button>Confirm {drafts.length} draft{drafts.length === 1 ? "" : "s"} below</Button>
              </form>
            )}
          </>
        }
      />

      {/* Overdue is a subset of confirmed, so it isn't added into "All". */}
      <StatusTabs
        path="/invoices"
        current={status}
        params={{ q: search, customer: customerId }}
        all={counts.draft + counts.confirmed + counts.paid + counts.cancelled}
        tabs={invoiceFilters.map((s) => ({ value: s, label: invoiceStatus[s].label, count: counts[s], dot: invoiceStatus[s].dot }))}
      />

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        {customerId && <input type="hidden" name="customer" value={customerId} />}
        <Input name="q" defaultValue={search} placeholder="Customer name or INV/2026/00042" aria-label="Search invoices" className="max-w-xs" />
        <button className={buttonClass({ variant: "secondary" })}>Search</button>
        {customerId && (
          <Link href="/invoices" className={buttonClass({ variant: "ghost" })}>
            Clear customer
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={search ? `No invoices match “${search}”` : status ? `No ${invoiceStatus[status].label.toLowerCase()} invoices` : "No invoices yet"}
          body={search ? "Try the number's last digits, or part of the customer's name." : "Active subscriptions are billed every night, or from their page with Bill now."}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 text-right font-medium">Still due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((i) => {
                const due = Number(i.total) - Number(i.amount_paid);
                return (
                  <tr key={i.id} className="hover:bg-ink/[0.02]">
                    <td className="px-5 py-3">
                      <Link href={`/invoices/${i.id}`} className="tabular font-medium hover:text-accent-hover">
                        {i.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      {i.customer ? (
                        <Link href={`/customers/${i.customer.id}`} className="hover:text-accent-hover">
                          {i.customer.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted">{date(i.invoice_date)}</td>
                    <td className="px-5 py-3 text-muted">{date(i.due_date)}</td>
                    <td className="px-5 py-3">
                      <InvoiceBadge status={invoiceDisplayStatus(i.status, i.due_date)} />
                    </td>
                    <td className="tabular px-5 py-3 text-right">{money(i.total)}</td>
                    <td className="tabular px-5 py-3 text-right text-muted">
                      {i.status === "confirmed" && due > 0 ? money(due) : <span className="text-faint">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Pager path="/invoices" params={{ q: search, status, customer: customerId }} page={page} pageSize={pageSize} total={total} noun="invoices" />
    </>
  );
}
