"use client";

import { useActionState } from "react";
import { Notice } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { recordPayment } from "@/services/invoice-actions";

export function PaymentForm({ invoiceId, due, today }: { invoiceId: string; due: number; today: string }) {
  const [state, action, pending] = useActionState(recordPayment, null);
  const v = state && !state.ok ? state.values : undefined;

  return (
    <form action={action} className="space-y-4 p-5">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      {state && !state.ok && <Notice>{state.error}</Notice>}
      {state?.ok && (
        <p role="status" className="text-sm text-teal">
          Payment recorded.
        </p>
      )}
      <fieldset key={JSON.stringify(v) + String(due)} disabled={pending} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (₹)" htmlFor="amount" hint="Part payments are fine.">
            <Input id="amount" name="amount" type="number" min={0.01} max={due} step="0.01" required className="tabular" defaultValue={v?.amount ?? due.toFixed(2)} />
          </Field>
          <Field label="Received on" htmlFor="paidOn">
            <Input id="paidOn" name="paidOn" type="date" required max={today} defaultValue={v?.paidOn ?? today} />
          </Field>
          <Field label="Method" htmlFor="method">
            <Select id="method" name="method" defaultValue={v?.method ?? "bank_transfer"}>
              <option value="bank_transfer">Bank transfer</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
            </Select>
          </Field>
          <Field label="Reference" htmlFor="reference" hint="UTR, cheque number…">
            <Input id="reference" name="reference" defaultValue={v?.reference} placeholder="HDFC0012345678" />
          </Field>
        </div>
        <Field label="Note" htmlFor="note">
          <Input id="note" name="note" defaultValue={v?.note} />
        </Field>
      </fieldset>
      <Button type="submit" disabled={pending}>
        {pending ? "Recording…" : "Record payment"}
      </Button>
    </form>
  );
}

export function PrintButton() {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()}>
      Print
    </Button>
  );
}
