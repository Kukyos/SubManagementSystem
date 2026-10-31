"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { passwordHint, passwordPattern } from "@/lib/password";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/services/auth-actions";

export function AuthHeading({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: ReactNode }) {
  return (
    <div className="legible mb-8">
      <p className="eyebrow rise">{eyebrow}</p>
      <h1 className="rise mt-4 text-5xl font-normal leading-[1.08] tracking-[-0.03em] [animation-delay:80ms]">
        {title}
      </h1>
      <p className="rise mt-4 text-[15px] leading-relaxed text-muted [animation-delay:160ms]">{lead}</p>
    </div>
  );
}

export function AuthSwitch({ children }: { children: ReactNode }) {
  return <p className="mt-8 text-sm text-muted">{children}</p>;
}

export const switchLink =
  "font-medium text-fg underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-hover";

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-field border border-pink/40 bg-pink/10 px-3.5 py-3 text-sm text-pink">
      {children}
    </p>
  );
}

function Sent({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="status" className="rise rounded-card border border-teal/30 bg-teal/[0.06] p-5">
      <p className="text-sm font-medium text-teal">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

function Submit({ pending, idle, busy }: { pending: boolean; idle: string; busy: string }) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? busy : idle}
    </Button>
  );
}

function PasswordToggleInput({
  id,
  name,
  autoComplete,
  required,
  autoFocus,
  minLength,
  pattern,
  title,
  defaultValue,
  label,
  hint,
}: {
  id: string;
  name: string;
  autoComplete: string;
  required?: boolean;
  autoFocus?: boolean;
  minLength?: number;
  pattern?: string;
  title?: string;
  defaultValue?: string;
  label: string;
  hint?: ReactNode;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          autoFocus={autoFocus}
          minLength={minLength}
          pattern={pattern}
          title={title}
          defaultValue={defaultValue}
          className="pr-10"
        />
        <button
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted transition-colors hover:text-fg"
        >
          {showPassword ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
              <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6A2.7 2.7 0 0 0 13.4 13.4" />
              <path d="M9.1 5.5A11.1 11.1 0 0 1 12 5c6.5 0 10 7 10 7a16.7 16.7 0 0 1-4.4 5.3" />
              <path d="M6.2 6.2A16.7 16.7 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 5.8-1.8" />
            </svg>
          )}
        </button>
      </div>
    </Field>
  );
}

function NewPassword({ label = "Password", autoFocus }: { label?: string; autoFocus?: boolean }) {
  return (
    <PasswordToggleInput
      id="password"
      name="password"
      label={label}
      autoComplete="new-password"
      required
      autoFocus={autoFocus}
      minLength={9}
      pattern={passwordPattern}
      title={passwordHint}
      hint={passwordHint}
    />
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <Notice>{state.error}</Notice>}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus defaultValue={state?.values?.email} />
      </Field>
      <PasswordToggleInput
        id="password"
        name="password"
        label="Password"
        autoComplete="current-password"
        required
      />
      <div className="-mt-2 text-right">
        <Link href="/forgot-password" className="text-xs text-muted hover:text-fg">
          Forgot your password?
        </Link>
      </div>
      <Submit pending={pending} idle="Sign in" busy="Signing in…" />
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, null);
  if (state?.sent) {
    return (
      <Sent title="Check your inbox">
        We sent a confirmation link to <span className="text-fg">{state.values?.email}</span>. Open it in this
        browser to finish setting up your account.
      </Sent>
    );
  }
  return (
    <form action={action} className="space-y-5">
      {state?.error && <Notice>{state.error}</Notice>}
      <Field label="Full name" htmlFor="fullName">
        <Input id="fullName" name="fullName" autoComplete="name" required autoFocus defaultValue={state?.values?.fullName} />
      </Field>
      <Field label="Work email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
      </Field>
      <Field label="Company" htmlFor="company" hint="Optional. Shown on your invoices.">
        <Input id="company" name="company" autoComplete="organization" defaultValue={state?.values?.company} />
      </Field>
      <NewPassword />
      <Submit pending={pending} idle="Create account" busy="Creating your account…" />
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  if (state?.sent) {
    return (
      <Sent title="Reset link on its way">
        If an account uses <span className="text-fg">{state.values?.email}</span>, it will get a link to choose a
        new password. The link works once and expires after an hour.
      </Sent>
    );
  }
  return (
    <form action={action} className="space-y-5">
      {state?.error && <Notice>{state.error}</Notice>}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus defaultValue={state?.values?.email} />
      </Field>
      <Submit pending={pending} idle="Send reset link" busy="Sending…" />
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <form action={action} className="space-y-5">
      {state?.error && <Notice>{state.error}</Notice>}
      <NewPassword label="New password" autoFocus />
      <PasswordToggleInput
        id="confirm"
        name="confirm"
        label="Type it again"
        autoComplete="new-password"
        required
      />
      <Submit pending={pending} idle="Save password" busy="Saving…" />
    </form>
  );
}

export function ExpiredLink() {
  return (
    <ButtonLink href="/forgot-password" size="lg" className="w-full">
      Send a new link
    </ButtonLink>
  );
}
