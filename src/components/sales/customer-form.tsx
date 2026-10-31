"use client";

import { useActionState } from "react";
import { Notice } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { saveCustomer } from "@/services/customer-actions";
import type { Customer } from "@/types/models";

export function CustomerForm({ customer }: { customer: Customer | null }) {
  const [state, action, pending] = useActionState(saveCustomer, null);
  const v = state?.values;
  const val = (k: string, stored: string | null | undefined) => v?.[k] ?? stored ?? "";

  return (
    <form action={action} className="space-y-5 p-5">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      {state && !state.ok && <Notice>{state.error}</Notice>}
      {state?.ok && (
        <p role="status" className="text-sm text-teal">
          Saved.
        </p>
      )}
      <fieldset key={JSON.stringify(v)} disabled={pending} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" required autoFocus={!customer} defaultValue={val("name", customer?.name)} placeholder="Ananya Krishnan" />
          </Field>
          <Field label="Company" htmlFor="company">
            <Input id="company" name="company" defaultValue={val("company", customer?.company)} placeholder="Krishnan Exports" />
          </Field>
          <Field label="Email" htmlFor="email" hint="Invoices go here. If they sign up with it, the portal links to this record.">
            <Input id="email" name="email" type="email" required defaultValue={val("email", customer?.email)} placeholder="ananya@krishnanexports.in" />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" defaultValue={val("phone", customer?.phone)} placeholder="+91 98400 12345" />
          </Field>
        </div>
        <Field label="Address" htmlFor="address">
          <Input id="address" name="address" defaultValue={val("address", customer?.address)} placeholder="14, Anna Salai" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="City" htmlFor="city">
            <Input id="city" name="city" defaultValue={val("city", customer?.city)} placeholder="Chennai" />
          </Field>
          <Field label="Country" htmlFor="country">
            <Input id="country" name="country" defaultValue={val("country", customer?.country ?? "India")} />
          </Field>
          <Field label="GSTIN" htmlFor="taxNumber">
            <Input id="taxNumber" name="taxNumber" defaultValue={val("taxNumber", customer?.tax_number)} placeholder="33ABCDE1234F1Z5" className="uppercase" />
          </Field>
        </div>
        <Field label="Notes" htmlFor="notes" hint="Internal. The customer never sees these.">
          <Textarea id="notes" name="notes" defaultValue={val("notes", customer?.notes)} />
        </Field>
      </fieldset>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : customer ? "Save changes" : "Add customer"}
      </Button>
    </form>
  );
}
