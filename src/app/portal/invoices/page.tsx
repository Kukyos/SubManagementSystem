import Link from "next/link";
import { InvoiceBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { date, money } from "@/lib/format";
import { invoiceDisplayStatus } from "@/lib/status";
import { requireRole } from "@/services/auth";
import { listMyInvoices } from "@/services/portal";

export const metadata = { title: "Invoices" };

const pageSize = 20;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole("customer");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { rows, total } = await listMyInvoices({ page, pageSize });

  return (
    <>
      <PageHeader eyebrow="Your account" title="Invoices" description="Every invoice we've sent you, and what's left to pay." />

      {rows.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          body="Your first one arrives when a subscription starts billing."
          action={<ButtonLink href="/portal/plans" size="sm">Browse plans</ButtonLink>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="table-cards w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Period</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 text-right font-medium">To pay</th>
                <th className="px-5 py-3"><span className="sr-only">Pay</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((i) => {
                const owed = i.status === "confirmed" ? Number(i.total) - Number(i.amount_paid) : 0;
                return (
                  <tr key={i.id} className="hover:bg-ink/[0.02]">
                    <td data-label="Invoice" className="px-5 py-3">
                      <Link href={`/portal/invoices/${i.id}`} className="tabular font-medium hover:text-accent-hover">
                        {i.number}
                      </Link>
                      <span className="block text-xs text-faint">{date(i.invoice_date)}</span>
                    </td>
                    <td data-label="Period" className="px-5 py-3 text-muted">{i.period_start ? `${date(i.period_start)} – ${date(i.period_end)}` : "—"}</td>
                    <td data-label="Due" className="px-5 py-3 text-muted">{date(i.due_date)}</td>
                    <td data-label="Status" className="px-5 py-3">
                      <InvoiceBadge status={invoiceDisplayStatus(i.status, i.due_date)} />
                    </td>
                    <td data-label="Total" className="tabular px-5 py-3 text-right">{money(i.total)}</td>
                    <td data-label="To pay" className={`tabular px-5 py-3 text-right ${owed > 0 ? "" : "text-faint"}`}>{owed > 0 ? money(owed) : "—"}</td>
                    <td data-label="" className="px-5 py-3 text-right">
                      {owed > 0 && (
                        <ButtonLink href={`/portal/invoices/${i.id}`} size="sm">
                          Pay
                        </ButtonLink>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Pager path="/portal/invoices" params={{}} page={page} pageSize={pageSize} total={total} noun="invoices" />
    </>
  );
}
