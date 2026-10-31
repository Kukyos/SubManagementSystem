"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Notice } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { date } from "@/lib/format";
import { runBilling } from "@/services/invoice-actions";

export function BillingRunForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(runBilling, null);
  const r = state?.ok ? state.result : null;

  return (
    <div>
      <form action={action} className="flex flex-wrap items-end gap-3 p-5">
        <Field label="Bill up to" htmlFor="asOf" hint="Today, or an earlier date to catch up.">
          <Input id="asOf" name="asOf" type="date" max={today} defaultValue={today} className="w-44" />
        </Field>
        <Button type="submit" disabled={pending} className="mb-[22px]">
          {pending ? "Running…" : "Run billing now"}
        </Button>
      </form>

      {state && !state.ok && (
        <div className="px-5 pb-5">
          <Notice>{state.error}</Notice>
        </div>
      )}

      {r && (
        <div role="status" className="border-t border-line p-5">
          <p className="text-sm font-medium text-teal">Run finished for {date(r.as_of)}.</p>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Count label="Subscriptions billed" value={r.subscriptions_billed} />
            <Count label="Draft invoices created" value={r.invoices_created} />
            <Count label="Closed on expiry" value={r.subscriptions_closed} />
            <Count label="Failed" value={r.failed.length} tone={r.failed.length ? "text-pink" : undefined} />
          </dl>
          {r.invoices_created === 0 && r.failed.length === 0 && (
            <p className="mt-4 text-sm text-muted">Nothing was due. Running again bills nothing twice.</p>
          )}
          {r.invoices_created > 0 && (
            <p className="mt-4 text-sm text-muted">
              New invoices are drafts.{" "}
              <Link href="/invoices?status=draft" className="text-fg underline decoration-accent underline-offset-4">
                Review and confirm them
              </Link>
              .
            </p>
          )}
          {r.failed.length > 0 && (
            <ul className="mt-4 divide-y divide-line rounded-field border border-pink/30">
              {r.failed.map((f) => (
                <li key={f.id} className="flex gap-3 px-4 py-2.5 text-sm">
                  <Link href={`/subscriptions/${f.id}`} className="tabular font-medium hover:text-accent-hover">
                    {f.subscription}
                  </Link>
                  <span className="text-pink">{f.error}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <dt className="text-xs text-faint">{label}</dt>
      <dd className={`tabular mt-1 text-2xl font-light ${tone ?? ""}`}>{value.toLocaleString("en-IN")}</dd>
    </div>
  );
}
