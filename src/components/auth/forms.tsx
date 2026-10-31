"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { passwordHint, passwordPattern, passwordRules } from "@/lib/password";
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
  meter,
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
  meter?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <Field label={label} htmlFor={id} hint={meter ? <StrengthMeter password={value} /> : hint}>
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
          onInput={meter ? (e) => setValue(e.currentTarget.value) : undefined}
          className="pr-10 [&::-ms-reveal]:hidden"
        />
        <button
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword((current) => !current)}
          className="group absolute inset-y-0 right-0 flex w-10 items-center justify-center"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`size-[18px] stroke-[1.4] [stroke-linejoin:round] transition-[color,fill,transform] duration-300 group-hover:rotate-[-12deg] ${
              showPassword ? "fill-transparent stroke-current text-muted group-hover:text-fg" : "fill-accent stroke-accent-hover text-accent"
            }`}
          >
            <path d="M12.5 2.5 21 16.5 3 19.5Z" />
            <path d="M12.5 2.5 11.5 13 3 19.5M11.5 13 21 16.5" fill="none" className={showPassword ? "" : "stroke-black/35"} />
          </svg>
        </button>
      </div>
    </Field>
  );
}

const meterColours = ["bg-pink", "bg-pink", "bg-amber", "bg-blue", "bg-teal"];

function StrengthMeter({ password }: { password: string }) {
  const passed = passwordRules.map((r) => r.test(password));
  const score = passed.filter(Boolean).length;
  return (
    <span className="block space-y-2.5 pt-1">
      <span className="flex gap-1" aria-hidden>
        {passwordRules.map((r, i) => (
          <span key={r.label} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i < score ? meterColours[score] : "bg-ink/10"}`} />
        ))}
      </span>
      <span className="grid grid-cols-2 gap-x-4 gap-y-1" aria-live="polite">
        {passwordRules.map((r, i) => (
          <span key={r.label} className={`flex items-center gap-1.5 transition-colors ${passed[i] ? "text-teal" : "text-faint"}`}>
            <span aria-hidden className={`size-2 [clip-path:polygon(50%_0,100%_100%,0_100%)] ${passed[i] ? "bg-teal" : "bg-ink/20"}`} />
            {r.label}
            <span className="sr-only">{passed[i] ? ", done" : ", missing"}</span>
          </span>
        ))}
      </span>
    </span>
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
      meter
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
