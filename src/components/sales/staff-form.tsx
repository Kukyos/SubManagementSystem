"use client";

import { useActionState, useEffect, useRef } from "react";
import { Notice } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { passwordHint, passwordPattern } from "@/lib/password";
import { inviteStaff } from "@/services/auth-actions";

export function StaffForm() {
  const [state, action, pending] = useActionState(inviteStaff, null);
  const form = useRef<HTMLFormElement>(null);
  const v = state?.error ? state.values : undefined;

  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="space-y-4 border-t border-line p-5">
      {state?.error && <Notice>{state.error}</Notice>}
      {state?.ok && (
        <p role="status" className="text-sm text-teal">
          {state.values?.email} can sign in now. Pass them the password; they can change it with Forgot password.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="fullName">
          <Input id="fullName" name="fullName" required defaultValue={v?.fullName} placeholder="Rohan Mehta" />
        </Field>
        <Field label="Work email" htmlFor="email">
          <Input id="email" name="email" type="email" required defaultValue={v?.email} placeholder="rohan@brightloop.in" />
        </Field>
      </div>
      <Field label="First password" htmlFor="password" hint={passwordHint}>
        <Input id="password" name="password" type="text" required pattern={passwordPattern} autoComplete="off" title={passwordHint} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add staff member"}
      </Button>
    </form>
  );
}
