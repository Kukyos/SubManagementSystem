import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/sales/customer-form";
import { InvoiceBadge, SubscriptionBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { date, money } from "@/lib/format";
import { invoiceDisplayStatus } from "@/lib/status";
import { requireRole } from "@/services/auth";
import { uuid } from "@/services/catalogue";
import { getCustomer } from "@/services/customers";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") return { title: "New customer" };
  const customer = uuid.test(id) ? await getCustomer(id) : null;
  return { title: customer?.name ?? "Customer" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin", "staff");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !uuid.test(id)) notFound();
  const customer = isNew ? null : await getCustomer(id);
  if (!isNew && !customer) notFound();

  const back = (
    <p className="mb-4 text-sm">
      <Link href="/customers" className="text-muted hover:text-fg">
        ← Customers
      </Link>
    </p>
  );

  if (!customer) {
    return (
      <>
        {back}
        <PageHeader eyebrow="Sales" title="New customer" description="Someone you bill. They don't need a portal login yet." />
        <Card className="max-w-3xl">
          <CardHeader title="Details" />
          <CustomerForm customer={null} />
        </Card>
      </>
    );
  }

  const active = customer.subscriptions.filter((s) => s.status === "active");
  return (
    <>
      {back}
      <PageHeader
        eyebrow={customer.company ?? "Customer"}
        title={customer.name}
        description={`${customer.email} · ${customer.user_id ? "has a portal login" : "no portal login yet"}`}
        actions={<ButtonLink href={`/subscriptions/new?customer=${customer.id}`}>New subscription</ButtonLink>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active subscriptions" value={active.length} hint={`${money(active.reduce((n, s) => n + s.amount, 0))} per cycle`} />
        <Stat
          label="Outstanding"
          value={money(customer.outstanding)}
          hint={customer.overdue > 0 ? <span className="text-pink">{money(customer.overdue)} overdue</span> : "Nothing overdue"}
        />
        <Stat label="Paid to date" value={money(customer.lifetimePaid)} />
        <Stat label="Invoices" value={customer.invoiceCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="space-y-6">
          <Card className="overflow-x-auto">
            <CardHeader title="Subscriptions" />
            {customer.subscriptions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No subscriptions yet.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-line">
                  {customer.subscriptions.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <Link href={`/subscriptions/${s.id}`} className="font-medium hover:text-accent-hover">
                          {s.number}
                        </Link>
                        <span className="block text-xs text-faint">{s.plan}</span>
                      </td>
                      <td className="px-5 py-3">
                        <SubscriptionBadge status={s.status} />
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {s.status === "active" ? `Next bill ${date(s.next_invoice_date)}` : `Starts ${date(s.start_date)}`}
                      </td>
                      <td className="tabular px-5 py-3 text-right">{money(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card className="overflow-x-auto">
            <CardHeader
              title="Recent invoices"
              action={
                customer.invoiceCount > customer.invoices.length && (
                  <Link href={`/invoices?customer=${customer.id}`} className="text-xs text-muted hover:text-fg">
                    All {customer.invoiceCount} →
                  </Link>
                )
              }
            />
            {customer.invoices.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No invoices yet.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-line">
                  {customer.invoices.map((i) => (
                    <tr key={i.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <Link href={`/invoices/${i.id}`} className="font-medium hover:text-accent-hover">
                          {i.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted">{date(i.invoice_date)}</td>
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

        <Card>
          <CardHeader title="Details" />
          <CustomerForm customer={customer} />
        </Card>
      </div>
    </>
  );
}
