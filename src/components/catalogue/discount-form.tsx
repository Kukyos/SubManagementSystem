"use client";

import { useActionState, useState } from "react";
import { Notice } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { saveDiscount } from "@/services/catalogue-actions";
import type { Product } from "@/types/models";
import type { DiscountDetail } from "@/services/catalogue";

export function DiscountForm({
  discount,
  products,
  readOnly,
}: {
  discount: DiscountDetail | null;
  products: Pick<Product, "id" | "name">[];
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState(saveDiscount, null);
  const v = state?.values;
  const [scope, setScope] = useState(v?.scope ?? discount?.scope ?? "products");
  const [type, setType] = useState(v?.type ?? discount?.type ?? "percent");
  const covered = new Set(v ? v.productIds.split(",") : (discount?.productIds ?? []));

  return (
    <form action={action} className="space-y-5 p-5">
      {discount && <input type="hidden" name="id" value={discount.id} />}
      {state && !state.ok && <Notice>{state.error}</Notice>}
      {state?.ok && (
        <p role="status" className="text-sm text-teal">
          Saved. It applies to invoices from the next billing run.
        </p>
      )}
      <fieldset key={JSON.stringify(v)} disabled={readOnly || pending} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" required autoFocus={!discount} defaultValue={v?.name ?? discount?.name} placeholder="Festive offer, 10% off CRM" />
          </Field>
          <Field label="Code" htmlFor="code" hint="Optional. Shown on invoices.">
            <Input id="code" name="code" defaultValue={v?.code ?? discount?.code ?? ""} placeholder="DIWALI10" className="uppercase" />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Type" htmlFor="type">
            <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </Select>
          </Field>
          <Field label={type === "percent" ? "Value (%)" : "Value (₹)"} htmlFor="value" hint={type === "fixed" ? "Taken off once per invoice." : undefined}>
            <Input
              id="value"
              name="value"
              type="number"
              min={0.01}
              max={type === "percent" ? 100 : undefined}
              step="0.01"
              required
              className="tabular"
              defaultValue={v?.value ?? discount?.value}
            />
          </Field>
          <Field label="Applies to" htmlFor="scope">
            <Select id="scope" name="scope" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
              <option value="products">Chosen products</option>
              <option value="subscription">Subscriptions it&apos;s attached to</option>
            </Select>
          </Field>
        </div>

        {scope === "products" ? (
          <fieldset>
            <legend className="pb-2 text-xs font-medium text-muted">Products it covers</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" name="productIds" value={p.id} defaultChecked={covered.has(p.id)} className="size-4 accent-accent" />
                  {p.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="text-sm text-muted">Attach it from a subscription&apos;s page. The whole invoice gets it, spread across the lines.</p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Minimum purchase (₹)" htmlFor="minPurchase" hint="Before tax. 0: no minimum.">
            <Input id="minPurchase" name="minPurchase" type="number" min={0} step="0.01" className="tabular" defaultValue={v?.minPurchase ?? discount?.min_purchase ?? 0} />
          </Field>
          <Field label="Minimum quantity" htmlFor="minQuantity" hint="0: no minimum.">
            <Input id="minQuantity" name="minQuantity" type="number" min={0} step={1} className="tabular" defaultValue={v?.minQuantity ?? discount?.min_quantity ?? 0} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Starts" htmlFor="startsOn" hint="Blank: now.">
            <Input id="startsOn" name="startsOn" type="date" defaultValue={v?.startsOn ?? discount?.starts_on ?? ""} />
          </Field>
          <Field label="Ends" htmlFor="endsOn" hint="Blank: no end.">
            <Input id="endsOn" name="endsOn" type="date" defaultValue={v?.endsOn ?? discount?.ends_on ?? ""} />
          </Field>
          <Field label="Usage limit" htmlFor="usageLimit" hint="Invoices it may apply to. Blank: unlimited.">
            <Input id="usageLimit" name="usageLimit" type="number" min={1} step={1} className="tabular" defaultValue={v?.usageLimit ?? discount?.usage_limit ?? ""} />
          </Field>
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={v ? v.isActive === "on" : (discount?.is_active ?? true)} className="mt-0.5 size-4 accent-accent" />
          <span>
            Active
            <span className="block text-xs text-faint">Off stops it applying to new invoices. Past invoices keep it.</span>
          </span>
        </label>
      </fieldset>
      {!readOnly && (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : discount ? "Save changes" : "Create discount"}
        </Button>
      )}
    </form>
  );
}
