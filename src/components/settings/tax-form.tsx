"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { saveTax } from "@/services/catalogue-actions";
import type { Tax } from "@/types/models";

// One row per tax, edited in place; with no tax it's the "add" row.
export function TaxRow({ tax, readOnly }: { tax?: Tax; readOnly: boolean }) {
  const [state, action, pending] = useActionState(saveTax, null);
  const v = state?.values;
  const isOn = (name: string, stored: boolean) => (v ? v[name] === "on" : stored);

  return (
    <form action={action} className="px-5 py-3">
      {tax && <input type="hidden" name="id" value={tax.id} />}
      <fieldset key={JSON.stringify(v)} disabled={readOnly || pending} className="flex flex-wrap items-center gap-3 text-sm">
        <Input name="name" required aria-label="Tax name" placeholder="GST 12%" defaultValue={v?.name ?? tax?.name} className="h-9 min-w-40 flex-1" />
        <span className="flex items-center gap-1.5">
          <Input name="rate" type="number" min={0} max={100} step="0.01" required aria-label="Rate in percent" defaultValue={v?.rate ?? tax?.rate} className="tabular h-9 w-24" />
          <span className="text-muted">%</span>
        </span>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" name="isDefault" defaultChecked={isOn("isDefault", tax?.is_default ?? false)} className="size-4 accent-accent" />
          Default
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" name="isActive" defaultChecked={isOn("isActive", tax?.is_active ?? true)} className="size-4 accent-accent" />
          Active
        </label>
        {!readOnly && (
          <Button size="sm" variant={tax ? "secondary" : "primary"}>
            {pending ? "Saving…" : tax ? "Save" : "Add tax"}
          </Button>
        )}
      </fieldset>
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`mt-2 text-xs ${state.ok ? "text-teal" : "text-pink"}`}>
          {state.ok ? (tax ? "Saved." : "Added.") : state.error}
        </p>
      )}
    </form>
  );
}
