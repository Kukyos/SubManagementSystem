import Link from "next/link";
import { MonthlyBars } from "@/components/reports/bar-chart";
import { buttonClass } from "@/components/ui/button";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { cn, date, money, moneyCompact } from "@/lib/format";
import { isDate, today } from "@/lib/forms";
import { subscriptionStatus } from "@/lib/status";
import { requireRole } from "@/services/auth";
import { getFinanceSummary } from "@/services/reports";
import { subscriptionStatuses } from "@/services/subscriptions";

export const metadata = { title: "Dashboard" };

const invoicedColor = "#8052ff";
const collectedColor = "#1fa982";

function presets(now: string) {
  const d = new Date(now + "T00:00:00Z");
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const q = Math.floor(m / 3) * 3;
  // Indian financial year starts in April.
  const fy = m >= 3 ? y : y - 1;
  return [
    { label: "This month", from: iso(new Date(Date.UTC(y, m, 1))) },
    { label: "Last 30 days", from: iso(new Date(Date.UTC(y, m, d.getUTCDate() - 29))) },
    { label: "This quarter", from: iso(new Date(Date.UTC(y, q, 1))) },
    { label: "This financial year", from: iso(new Date(Date.UTC(fy, 3, 1))) },
  ].map((p) => ({ ...p, to: now }));
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireRole("admin", "staff");
  const params = await searchParams;
  const now = today();
  const from = params.from && isDate(params.from) ? params.from : undefined;
  const to = params.to && isDate(params.to) ? params.to : undefined;
  const s = await getFinanceSummary(from, to);
  const ranges = presets(now);
  const activeRange = ranges.find((r) => r.from === s.from && r.to === s.to);
  const statusTotal = Object.values(s.subscriptions_by_status).reduce((a, b) => a + (b ?? 0), 0) || 1;
  const topMrr = Math.max(1, ...s.top_plans.map((p) => p.mrr));
  const months = s.monthly.map((m) => m.month);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`Good ${greeting()}, ${user.fullName.split(" ")[0]}`}
        description="Active subscriptions, MRR, collections and overdue invoices at a glance."
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {ranges.map((r) => (
          <Link
            key={r.label}
            href={`/dashboard?from=${r.from}&to=${r.to}`}
            aria-current={activeRange?.label === r.label ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              activeRange?.label === r.label ? "border-accent bg-accent/15 text-fg" : "border-line text-muted hover:text-fg",
            )}
          >
            {r.label}
          </Link>
        ))}
        <form className="ml-auto flex items-center gap-2">
          <Input name="from" type="date" defaultValue={s.from} max={now} aria-label="From" className="h-8 !w-38 text-xs" />
          <span className="text-xs text-faint">to</span>
          <Input name="to" type="date" defaultValue={s.to} max={now} aria-label="To" className="h-8 !w-38 text-xs" />
          <button className={buttonClass({ variant: "secondary", size: "sm" })}>Apply</button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR" value={moneyCompact(s.mrr)} hint={`${s.active_subscriptions.toLocaleString("en-IN")} active subscriptions`} />
        <Stat label="Collected" value={moneyCompact(s.collected)} hint={`${date(s.from)} – ${date(s.to)}`} />
        <Stat label="Invoiced" value={moneyCompact(s.invoiced)} hint={`Confirmed and paid, same range`} />
        <Link href="/invoices?status=overdue" className="group">
          <Stat
            label="Overdue"
            value={<span className={s.overdue_count ? "text-pink" : undefined}>{moneyCompact(s.overdue_amount)}</span>}
            hint={
              <>
                {s.overdue_count} invoice{s.overdue_count === 1 ? "" : "s"} · {moneyCompact(s.outstanding)} outstanding in all{" "}
                <span className="text-faint group-hover:text-muted">→</span>
              </>
            }
          />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Invoiced and collected" action={<span className="text-xs text-faint">Last 12 months</span>} />
          <div className="p-5">
            <MonthlyBars
              title="Invoiced and collected per month, last 12 months"
              months={months}
              series={[
                { key: "invoiced", label: "Invoiced", color: invoicedColor, values: s.monthly.map((m) => m.invoiced) },
                { key: "collected", label: "Collected", color: collectedColor, values: s.monthly.map((m) => m.collected) },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Subscriptions by status" action={<span className="tabular text-xs text-faint">{statusTotal.toLocaleString("en-IN")}</span>} />
          <ul className="space-y-3 p-5">
            {subscriptionStatuses.map((st) => {
              const n = s.subscriptions_by_status[st] ?? 0;
              return (
                <li key={st}>
                  <Link href={`/subscriptions?status=${st}`} className="group block text-sm">
                    <span className="flex justify-between">
                      <span className="text-muted group-hover:text-fg">{subscriptionStatus[st].label}</span>
                      <span className="tabular">{n.toLocaleString("en-IN")}</span>
                    </span>
                    <span className="mt-1.5 block h-1.5 rounded-full bg-white/[0.06]">
                      <span className="block h-full rounded-full" style={{ width: `${(n / statusTotal) * 100}%`, background: subscriptionStatus[st].hex }} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {s.draft_invoices > 0 && (
            <Link href="/invoices?status=draft" className="block border-t border-line px-5 py-3 text-xs text-muted hover:text-fg">
              {s.draft_invoices} draft invoice{s.draft_invoices === 1 ? "" : "s"} waiting to be confirmed →
            </Link>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="New and closed subscriptions" action={<span className="text-xs text-faint">Last 12 months</span>} />
          <div className="p-5">
            <MonthlyBars
              title="New and closed subscriptions per month, last 12 months"
              format="count"
              months={months}
              series={[
                { key: "new", label: "New", color: invoicedColor, values: s.monthly.map((m) => m.new_subscriptions) },
                { key: "closed", label: "Closed", color: "#8a8a8f", values: s.monthly.map((m) => m.closed_subscriptions) },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Top plans by MRR" />
          {s.top_plans.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No active subscriptions yet.</p>
          ) : (
            <ul className="space-y-4 p-5">
              {s.top_plans.map((p) => (
                <li key={p.name} className="text-sm">
                  <span className="flex justify-between gap-3">
                    <span>
                      {p.name}
                      <span className="ml-2 text-xs text-faint">{p.subscriptions} active</span>
                    </span>
                    <span className="tabular">{money(p.mrr)}</span>
                  </span>
                  <span className="mt-1.5 block h-1.5 rounded-full bg-white/[0.06]">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(p.mrr / topMrr) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}
