"use client";

import { useActionState, useState } from "react";
import { Notice } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cycle, money } from "@/lib/format";
import { addLine, createSubscription } from "@/services/subscription-actions";
import type { Customer, Plan, Product, ProductVariant } from "@/types/models";

const termLabels = {
  immediate: "Due on receipt",
  net_7: "7 days",
  net_15: "15 days",
  net_30: "30 days",
  net_45: "45 days",
  net_60: "60 days",
} as const;

export function NewSubscriptionForm({
  customers,
  plans,
  customerId,
  today,
}: {
  customers: Pick<Customer, "id" | "name" | "company">[];
  plans: Plan[];
  customerId?: string;
  today: string;
}) {
  const [state, action, pending] = useActionState(createSubscription, null);
  const v = state?.values;

  return (
    <form action={action} className="space-y-5 p-5">
      {state && !state.ok && <Notice>{state.error}</Notice>}
      <fieldset key={JSON.stringify(v)} disabled={pending} className="space-y-5">
        <Field label="Customer" htmlFor="customerId">
          <Select id="customerId" name="customerId" required defaultValue={v?.customerId ?? customerId ?? ""}>
            <option value="" disabled>
              Pick a customer
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` · ${c.company}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Plan" htmlFor="planId" hint="Its product is added as the first line at the plan's minimum quantity.">
          <Select id="planId" name="planId" required defaultValue={v?.planId ?? ""}>
            <option value="" disabled>
              Pick a plan
            </option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {money(p.price)} {cycle(p.billing_period, p.billing_interval).toLowerCase()}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Starts" htmlFor="startDate" hint="Billing begins here once it's active.">
            <Input id="startDate" name="startDate" type="date" required defaultValue={v?.startDate ?? today} />
          </Field>
          <Field label="Ends" htmlFor="expiryDate" hint="Blank: runs until closed.">
            <Input id="expiryDate" name="expiryDate" type="date" defaultValue={v?.expiryDate ?? ""} />
          </Field>
          <Field label="Payment terms" htmlFor="paymentTerms">
            <Select id="paymentTerms" name="paymentTerms" defaultValue={v?.paymentTerms ?? "net_15"}>
              {Object.entries(termLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Notes" htmlFor="notes">
          <Textarea id="notes" name="notes" defaultValue={v?.notes ?? ""} />
        </Field>
      </fieldset>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create draft"}
      </Button>
    </form>
  );
}

export function AddLineForm({
  subscriptionId,
  products,
  variants,
}: {
  subscriptionId: string;
  products: Pick<Product, "id" | "name" | "sales_price">[];
  variants: ProductVariant[];
}) {
  const [state, action, pending] = useActionState(addLine, null);
  const [productId, setProductId] = useState("");
  const [seen, setSeen] = useState(state);
  const options = variants.filter((v) => v.product_id === productId);

  // React resets the form after a successful action; clear the controlled picker with it.
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setProductId("");
  }

  return (
    <form action={action} className="space-y-3 border-t border-line p-5">
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      {state && !state.ok && <Notice>{state.error}</Notice>}
      <div className="grid gap-3 sm:grid-cols-[2fr_1.5fr_6rem_auto] sm:items-end">
        <Field label="Product" htmlFor="productId">
          <Select id="productId" name="productId" required value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="" disabled>
              Add a product
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Variant" htmlFor="variantId">
          <Select id="variantId" name="variantId" disabled={!options.length} key={productId}>
            <option value="">{options.length ? "Standard" : "No variants"}</option>
            {options.map((v) => (
              <option key={v.id} value={v.id}>
                {v.attribute}: {v.value} (+{money(v.extra_price)})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Qty" htmlFor="quantity">
          <Input id="quantity" name="quantity" type="number" min={1} step={1} defaultValue={1} className="tabular" />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Adding…" : "Add line"}
        </Button>
      </div>
    </form>
  );
}
