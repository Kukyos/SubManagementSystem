"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { FormState } from "@/services/catalogue-actions";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

// One status button. Errors from the database (a plan that can't pause, a
// minimum quantity not met) come back as readable sentences and show under it.
export function ActionButton({
  action,
  fields,
  label,
  busy,
  variant = "secondary",
  askReason,
}: {
  action: Action;
  fields: Record<string, string>;
  label: string;
  busy: string;
  variant?: "primary" | "secondary" | "danger";
  askReason?: string;
}) {
  const [state, run, pending] = useActionState(action, null);
  const [asking, setAsking] = useState(false);

  return (
    <form action={run} className="contents">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {askReason && asking ? (
        <span className="flex w-full flex-wrap items-center gap-2">
          <Input name="reason" placeholder={askReason} aria-label={askReason} autoFocus className="h-8 max-w-xs" />
          <Button size="sm" variant={variant} disabled={pending}>
            {pending ? busy : label}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAsking(false)}>
            Keep it
          </Button>
        </span>
      ) : (
        <Button
          size="sm"
          variant={variant}
          disabled={pending}
          type={askReason ? "button" : "submit"}
          onClick={askReason ? () => setAsking(true) : undefined}
        >
          {pending ? busy : label}
        </Button>
      )}
      {state && (
        <p role={state.ok ? "status" : "alert"} className={`order-last w-full text-sm ${state.ok ? "text-teal" : "text-pink"}`}>
          {state.ok ? state.values?.message : state.error}
        </p>
      )}
    </form>
  );
}
