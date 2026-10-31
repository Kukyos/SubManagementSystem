import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { date, money } from "@/lib/format";
import { invoiceDisplayStatus } from "@/lib/status";
import type { InvoiceDetail } from "@/services/invoices";

// The invoice as the customer sees it and as it prints. Shared by the console and the portal.
export function InvoiceDocument({ inv }: { inv: InvoiceDetail }) {
  const due = Math.round((Number(inv.total) - Number(inv.amount_paid)) * 100) / 100;
  const display = invoiceDisplayStatus(inv.status, inv.due_date);

  return (
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
  );
}
