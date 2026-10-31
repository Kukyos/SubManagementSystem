"use client";

import { useActionState } from "react";
import { Notice } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cycle, money } from "@/lib/format";
import { saveTemplate } from "@/services/catalogue-actions";
import type { Plan, QuotationTemplate } from "@/types/models";

const termLabels = {
  immediate: "Due on receipt",
  net_7: "7 days",
  net_15: "15 days",
  net_30: "30 days",
  net_45: "45 days",
  net_60: "60 days",
} as const;

export function TemplateForm({
  template,
  plans,
  readOnly,
}: {
  template: QuotationTemplate | null;
  plans: Plan[];
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState(saveTemplate, null);
  const v = state?.values;

  return (
    <form action={action} className="space-y-5 p-5">
      {template && <input type="hidden" name="id" value={template.id} />}
      {state && !state.ok && <Notice>{state.error}</Notice>}
      {state?.ok && (
        <p role="status" className="text-sm text-teal">
          Saved.
        </p>
      )}
      <fieldset key={JSON.stringify(v)} disabled={readOnly || pending} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" required autoFocus={!template} defaultValue={v?.name ?? template?.name} placeholder="CRM starter, 12 months" />
          </Field>
          <Field label="Plan" htmlFor="planId" hint={template ? undefined : "Its product becomes the first line."}>
            <Select id="planId" name="planId" required defaultValue={v?.planId ?? template?.plan_id ?? ""}>
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
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Quote valid for (days)" htmlFor="validityDays">
            <Input
              id="validityDays"
              name="validityDays"
              type="number"
              min={1}
              max={365}
              step={1}
              required
              className="tabular"
              defaultValue={v?.validityDays ?? template?.validity_days ?? 30}
            />
          </Field>
          <Field label="Contract length (cycles)" htmlFor="durationPeriods" hint="Blank: open-ended.">
            <Input
              id="durationPeriods"
              name="durationPeriods"
              type="number"
              min={1}
              max={120}
              step={1}
              className="tabular"
              defaultValue={v?.durationPeriods ?? template?.duration_periods ?? ""}
            />
          </Field>
          <Field label="Payment terms" htmlFor="paymentTerms">
            <Select id="paymentTerms" name="paymentTerms" defaultValue={v?.paymentTerms ?? template?.payment_terms ?? "net_15"}>
              {Object.entries(termLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Notes" htmlFor="notes" hint="Copied onto each subscription made from it.">
          <Textarea id="notes" name="notes" defaultValue={v?.notes ?? template?.notes ?? ""} />
        </Field>
      </fieldset>
      {!readOnly && (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : template ? "Save changes" : "Create template"}
        </Button>
      )}
    </form>
  );
}
