import Link from "next/link";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { ExportLink } from "@/components/ui/export-link";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { date, money, moneyCompact } from "@/lib/format";
import { methodLabel } from "@/lib/status";
import { ActionButton } from "@/components/sales/action-button";
import { requireRole } from "@/services/auth";
import { sendOverdueReminders } from "@/services/invoice-actions";
import { listPayments, overdueAging, paymentMethods } from "@/services/payments";
import type { PaymentMethod } from "@/types/models";

export const metadata = { title: "Payments" };
// Sending reminders to every overdue customer can take a while.
export const maxDuration = 120;

const pageSize = 25;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole("admin", "staff");
  const params = await searchParams;
  const search = params.q?.trim() || undefined;
  const method = paymentMethods.includes(params.method as PaymentMethod) ? (params.method as PaymentMethod) : undefined;
  const from = params.from || undefined;
  const to = params.to || undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const [{ rows, total }, aging] = await Promise.all([listPayments({ page, pageSize, search, method, from, to }), overdueAging()]);
  const filtered = !!(search || method || from || to);
  const worst = Math.max(...aging.buckets.map((b) => b.amount), 1);

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Payments"
        description="Every payment recorded against an invoice, and what is still overdue."
        actions={<ExportLink list="payments" params={{ q: search, method, from, to }} />}
      />

      <Card className="mb-8">
        <CardHeader
          title={
            <>
              Overdue <span className="tabular ml-2 text-muted">{money(aging.total)}</span>
              <span className="ml-2 text-xs font-normal text-faint">
                across {aging.count} invoice{aging.count === 1 ? "" : "s"}
              </span>
            </>
          }
          action={
            aging.count > 0 && (
              <ButtonLink href="/invoices?status=overdue" size="sm" variant="secondary">
                All overdue invoices
              </ButtonLink>
            )
          }
        />
        {aging.count > 0 && (
          // A second click to confirm: this emails real customers.
          <details className="group border-b border-line px-5 py-3">
            <summary className="cursor-pointer list-none text-sm text-muted hover:text-fg group-open:text-fg">
              Email reminders to {aging.customers} customer{aging.customers === 1 ? "" : "s"}…
            </summary>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-xs text-muted">
                One email each, listing what they owe past due with a link to pay.
              </p>
              <ActionButton action={sendOverdueReminders} fields={{}} label="Send reminders" busy="Sending…" variant="primary" />
            </div>
          </details>
        )}
        {aging.count === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">Nothing overdue. Every confirmed invoice is inside its payment terms.</p>
        ) : (
          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ul className="space-y-3" aria-label="Overdue by age">
              {aging.buckets.map((b, i) => (
                <li key={b.label} className="text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted">{b.label}</span>
                    <span className="tabular">
                      {moneyCompact(b.amount)} <span className="text-faint">· {b.count}</span>
                    </span>
                  </div>
                  {/* Older debt reads hotter: amber through to pink. */}
                  <div className="mt-1.5 h-1.5 rounded-full bg-ink/[0.06]">
                    <div
                      className={`h-full rounded-full ${["bg-amber/60", "bg-amber", "bg-pink/70", "bg-pink"][i]}`}
                      style={{ width: `${(b.amount / worst) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">Longest outstanding</p>
              <ul className="divide-y divide-line text-sm">
                {aging.oldest.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-2">
                    <Link href={`/invoices/${i.id}`} className="tabular w-32 shrink-0 font-medium hover:text-accent-hover">
                      {i.number}
                    </Link>
                    <span className="min-w-0 flex-1 truncate text-muted">{i.customer?.name ?? "—"}</span>
                    <span className="tabular shrink-0 text-xs text-pink">{i.daysLate} days late</span>
                    <span className="tabular w-24 shrink-0 text-right">{money(i.balance)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>

      <form className="mb-4 flex flex-wrap items-center gap-2" role="search">
        <Input name="q" defaultValue={search} placeholder="Customer or invoice number" aria-label="Search payments" className="max-w-xs" />
        <Select name="method" defaultValue={method ?? ""} aria-label="Method" className="!w-44">
          <option value="">Any method</option>
          {paymentMethods.map((m) => (
            <option key={m} value={m}>
              {methodLabel[m]}
            </option>
          ))}
        </Select>
        <Input name="from" type="date" defaultValue={from} aria-label="Received from" className="!w-40" />
        <span className="text-xs text-faint">to</span>
        <Input name="to" type="date" defaultValue={to} aria-label="Received to" className="!w-40" />
        <button className={buttonClass({ variant: "secondary" })}>Filter</button>
        {filtered && (
          <Link href="/payments" className="text-sm text-muted hover:text-fg">
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={filtered ? "No payments match" : "No payments yet"}
          body={filtered ? "Try a wider date range or another method." : "Record one from a confirmed invoice, or let customers pay from the portal."}
          action={
            filtered ? (
              <ButtonLink href="/payments" size="sm" variant="secondary">Clear filters</ButtonLink>
            ) : (
              <ButtonLink href="/invoices?status=confirmed" size="sm">Unpaid invoices</ButtonLink>
            )
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="table-cards w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Received</th>
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 font-medium">Recorded by</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-ink/[0.02]">
                  <td data-label="Received" className="px-5 py-3 text-muted">{date(p.paid_on)}</td>
                  <td data-label="Invoice" className="px-5 py-3">
                    {p.invoice ? (
                      <Link href={`/invoices/${p.invoice.id}`} className="tabular font-medium hover:text-accent-hover">
                        {p.invoice.number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td data-label="Customer" className="px-5 py-3">
                    {p.customer ? (
                      <Link href={`/customers/${p.customer.id}`} className="hover:text-accent-hover">
                        {p.customer.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td data-label="Method" className="px-5 py-3 text-muted">{methodLabel[p.method]}</td>
                  <td data-label="Reference" className="px-5 py-3 font-mono text-xs text-faint">{p.reference ?? "—"}</td>
                  <td data-label="Recorded by" className="px-5 py-3 text-muted">{p.recordedBy ?? (p.method === "online" ? "Customer, online" : "—")}</td>
                  <td data-label="Amount" className="tabular px-5 py-3 text-right">{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Pager path="/payments" params={{ q: search, method, from, to }} page={page} pageSize={pageSize} total={total} noun="payments" />
    </>
  );
}
