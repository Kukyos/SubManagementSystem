import { BillingRunForm } from "@/components/sales/billing-run-form";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { today } from "@/lib/forms";
import { date } from "@/lib/format";
import { requireRole } from "@/services/auth";
import { billingDue, listBillingRuns } from "@/services/invoices";

export const metadata = { title: "Billing run" };

const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function Page() {
  await requireRole("admin", "staff");
  const [runs, due] = await Promise.all([listBillingRuns(), billingDue()]);

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Billing run"
        description="Invoice every subscription that is due, and see what each run did. It also runs by itself every night at 6:00 IST."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Due now" value={due.due.toLocaleString("en-IN")} hint="Active subscriptions with a period to bill" />
        <Stat label="Draft invoices" value={due.draftInvoices.toLocaleString("en-IN")} hint="Waiting to be confirmed and sent" />
        <Stat label="Last run" value={runs[0] ? when.format(new Date(runs[0].created_at)) : "—"} hint={runs[0] ? (runs[0].ranBy ?? "Nightly job") : "No runs yet"} />
      </div>

      <Card className="mb-6">
        <CardHeader title="Run now" action={<span className="text-xs text-faint">Safe to re-run: no period is billed twice</span>} />
        <BillingRunForm today={today()} />
      </Card>

      <h2 className="mb-3 text-sm font-medium">History</h2>
      {runs.length === 0 ? (
        <EmptyState title="No runs yet" body="Runs from this page and the nightly job show up here." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Ran</th>
                <th className="px-5 py-3 font-medium">Billed up to</th>
                <th className="px-5 py-3 font-medium">By</th>
                <th className="px-5 py-3 text-right font-medium">Subscriptions</th>
                <th className="px-5 py-3 text-right font-medium">Invoices</th>
                <th className="px-5 py-3 text-right font-medium">Closed</th>
                <th className="px-5 py-3 text-right font-medium">Failed</th>
                <th className="px-5 py-3 text-right font-medium">Took</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {runs.map((r) => {
                const failed = Array.isArray(r.failed) ? r.failed.length : 0;
                return (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3">{when.format(new Date(r.created_at))}</td>
                    <td className="px-5 py-3 text-muted">{date(r.as_of)}</td>
                    <td className="px-5 py-3 text-muted">{r.ranBy ?? "Nightly job"}</td>
                    <td className="tabular px-5 py-3 text-right">{r.subscriptions_billed}</td>
                    <td className="tabular px-5 py-3 text-right">{r.invoices_created}</td>
                    <td className="tabular px-5 py-3 text-right text-muted">{r.subscriptions_closed}</td>
                    <td className={`tabular px-5 py-3 text-right ${failed ? "text-pink" : "text-faint"}`}>{failed}</td>
                    <td className="tabular px-5 py-3 text-right text-faint">{(r.duration_ms / 1000).toFixed(1)}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
