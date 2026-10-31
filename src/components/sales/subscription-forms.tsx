"use client";

import { useActionState, useState } from "react";
import { Notice } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cycle, money } from "@/lib/format";
import { addLine, attachDiscount, createSubscription } from "@/services/subscription-actions";
import type { FormState } from "@/services/catalogue-actions";
import type { Customer, Discount, Plan, Product, ProductVariant, QuotationTemplate } from "@/types/models";

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
  templates,
  customerId,
  templateId,
  today,
}: {
  customers: Pick<Customer, "id" | "name" | "company">[];
  plans: Plan[];
  templates: QuotationTemplate[];
  customerId?: string;
  templateId?: string;
  today: string;
}) {
  const [state, action, pending] = useActionState(createSubscription, null);
  const v = state?.values;
  const [chosen, setChosen] = useState(v?.templateId ?? templateId ?? "");
  const template = templates.find((t) => t.id === chosen);

  return (
    <form action={action} className="space-y-5 p-5">
      {state && !state.ok && <Notice>{state.error}</Notice>}
      <fieldset key={JSON.stringify(v)} disabled={pending} className="space-y-5">
        {templates.length > 0 && (
          <Field
            label="Quotation template"
            htmlFor="templateId"
            hint={template ? "Plan, terms and lines come from the template." : "Optional. Start from a ready-made offer."}
          >
            <Select id="templateId" name="templateId" value={chosen} onChange={(e) => setChosen(e.target.value)}>
              <option value="">No template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
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
        <Field label="Plan" htmlFor="planId" hint={template ? undefined : "Its product is added as the first line at the plan's minimum quantity."}>
          <Select id="planId" name="planId" required key={`plan-${chosen}`} disabled={!!template} defaultValue={template?.plan_id ?? v?.planId ?? ""}>
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
          <Field
            label="Ends"
            htmlFor="expiryDate"
            hint={template?.duration_periods ? `Blank: ${template.duration_periods} billing cycles from the start.` : "Blank: runs until closed."}
          >
            <Input id="expiryDate" name="expiryDate" type="date" defaultValue={v?.expiryDate ?? ""} />
          </Field>
          <Field label="Payment terms" htmlFor="paymentTerms">
            <Select
              id="paymentTerms"
              name="paymentTerms"
              key={`terms-${chosen}`}
              disabled={!!template}
              defaultValue={template?.payment_terms ?? v?.paymentTerms ?? "net_15"}
            >
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

// Also used by quotation templates, which pass their own action and allow a fixed price.
export function AddLineForm({
  fields,
  products,
  variants,
  lineAction = addLine,
  withPrice,
}: {
  fields: Record<string, string>;
  products: Pick<Product, "id" | "name" | "sales_price">[];
  variants: ProductVariant[];
  lineAction?: (state: FormState, formData: FormData) => Promise<FormState>;
  withPrice?: boolean;
}) {
  const [state, action, pending] = useActionState(lineAction, null);
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
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {state && !state.ok && <Notice>{state.error}</Notice>}
      <div className={`grid gap-3 sm:items-end ${withPrice ? "sm:grid-cols-[2fr_1.5fr_6rem_8rem_auto]" : "sm:grid-cols-[2fr_1.5fr_6rem_auto]"}`}>
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
        {withPrice && (
          <Field label="Unit price (₹)" htmlFor="unitPrice">
            <Input id="unitPrice" name="unitPrice" type="number" min={0} step="0.01" placeholder="List price" className="tabular" />
          </Field>
        )}
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Adding…" : "Add line"}
        </Button>
      </div>
    </form>
  );
}

export function AttachDiscountForm({ subscriptionId, discounts }: { subscriptionId: string; discounts: Pick<Discount, "id" | "name" | "type" | "value">[] }) {
  const [state, action, pending] = useActionState(attachDiscount, null);
  return (
    <form action={action} className="space-y-2 border-t border-line p-5">
      <input type="hidden" name="id" value={subscriptionId} />
      <div className="flex gap-2">
        <Select name="discountId" required defaultValue="" aria-label="Discount to attach" className="h-9">
          <option value="" disabled>
            Attach a discount
          </option>
          {discounts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.type === "percent" ? `${Number(d.value)}%` : money(d.value)})
            </option>
          ))}
        </Select>
        <Button size="sm" variant="secondary" disabled={pending} className="h-9">
          {pending ? "Attaching…" : "Attach"}
        </Button>
      </div>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`text-xs ${state.ok ? "text-teal" : "text-pink"}`}>
          {state.ok ? state.values?.message : state.error}
        </p>
      )}
    </form>
  );
}
