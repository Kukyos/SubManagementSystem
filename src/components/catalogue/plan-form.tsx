"use client";

import { useActionState } from "react";
import { Notice } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { savePlan } from "@/services/catalogue-actions";
import type { Plan, Product } from "@/types/models";

const rules = [
  { name: "isActive", label: "Available for new subscriptions", hint: "Off archives the plan. Existing subscriptions keep billing." },
  { name: "renewable", label: "Renewable", hint: "Can be renewed for another term when it ends." },
  { name: "pausable", label: "Pausable", hint: "Customer or staff can pause billing." },
  { name: "closable", label: "Closable early", hint: "Can be closed before its end date." },
  { name: "autoClose", label: "Closes itself on expiry", hint: "The nightly run closes it once its end date passes." },
] as const;

const ruleDefault = { isActive: true, renewable: true, pausable: true, closable: true, autoClose: false };
const ruleColumn = { isActive: "is_active", renewable: "renewable", pausable: "pausable", closable: "closable", autoClose: "auto_close" } as const;

export function PlanForm({
  plan,
  products,
  readOnly,
}: {
  plan: Plan | null;
  products: Pick<Product, "id" | "name" | "sales_price">[];
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState(savePlan, null);
  const v = state?.values;
  // After a failed save, show what was typed; otherwise what's stored.
  const checked = (name: (typeof rules)[number]["name"]) =>
    v ? v[name] === "on" : plan ? plan[ruleColumn[name]] : ruleDefault[name];

  return (
    <form action={action} className="space-y-5 p-5">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      {state && !state.ok && <Notice>{state.error}</Notice>}
      {state?.ok && (
        <p role="status" className="text-sm text-teal">
          Saved.
        </p>
      )}

      {/* React resets the form after each action and selects ignore a new defaultValue; re-keying remounts them. */}
      <fieldset key={JSON.stringify(v)} disabled={readOnly || pending} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" required autoFocus={!plan} defaultValue={v?.name ?? plan?.name} placeholder="Odoo Standard, monthly" />
          </Field>
          <Field label="Product" htmlFor="productId" hint="What a subscription on this plan bills for.">
            <Select id="productId" name="productId" defaultValue={v?.productId ?? plan?.product_id ?? ""}>
              <option value="">No product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Price (₹)" htmlFor="price" hint="Per unit, per billing cycle, before tax.">
            <Input id="price" name="price" type="number" min={0} step="0.01" required className="tabular" defaultValue={v?.price ?? plan?.price} />
          </Field>
          <Field label="Bills every" htmlFor="billingInterval">
            <Input id="billingInterval" name="billingInterval" type="number" min={1} max={36} step={1} required className="tabular" defaultValue={v?.billingInterval ?? plan?.billing_interval ?? 1} />
          </Field>
          <Field label="Period" htmlFor="billingPeriod">
            <Select id="billingPeriod" name="billingPeriod" defaultValue={v?.billingPeriod ?? plan?.billing_period ?? "monthly"}>
              <option value="daily">Day</option>
              <option value="weekly">Week</option>
              <option value="monthly">Month</option>
              <option value="yearly">Year</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Minimum quantity" htmlFor="minQuantity">
            <Input id="minQuantity" name="minQuantity" type="number" min={1} step={1} required className="tabular" defaultValue={v?.minQuantity ?? plan?.min_quantity ?? 1} />
          </Field>
          <Field label="Available from" htmlFor="availableFrom" hint="Blank: from today.">
            <Input id="availableFrom" name="availableFrom" type="date" defaultValue={v?.availableFrom ?? plan?.available_from ?? ""} />
          </Field>
          <Field label="Available until" htmlFor="availableUntil" hint="Blank: no end.">
            <Input id="availableUntil" name="availableUntil" type="date" defaultValue={v?.availableUntil ?? plan?.available_until ?? ""} />
          </Field>
        </div>

        <fieldset className="space-y-3">
          <legend className="pb-1 text-xs font-medium text-muted">Rules</legend>
          {rules.map((r) => (
            <label key={r.name} className="flex items-start gap-3 text-sm">
              <input type="checkbox" name={r.name} defaultChecked={checked(r.name)} className="mt-0.5 size-4 accent-accent" />
              <span>
                {r.label}
                <span className="block text-xs text-faint">{r.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <Field label="Description" htmlFor="description" hint="Shown to customers on the portal's plan list.">
          <Textarea id="description" name="description" defaultValue={v?.description ?? plan?.description ?? ""} />
        </Field>
      </fieldset>

      {!readOnly && (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : plan ? "Save changes" : "Create plan"}
        </Button>
      )}
    </form>
  );
}
