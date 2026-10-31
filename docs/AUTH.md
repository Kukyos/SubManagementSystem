# Auth and access

## Roles

| | Admin | Staff | Customer |
|---|---|---|---|
| Products, variants, plans, taxes | read / write | read | read (no cost price) |
| Quotation templates, discounts | read / write | read | none |
| Customers | all | read / create / edit | own record |
| Subscriptions and lines | all | all (delete drafts and quotes only) | own, read; pause / resume / cancel via portal |
| Invoices and lines | all | all (delete drafts only) | own, read |
| Payments | record, delete | record | own, read; pay online |
| Billing run, finance dashboard | yes | yes | no |
| Add staff | **yes** | no | no |

Enforced by RLS (`supabase/migrations/…_access_and_billing.sql`), not by the UI.
The UI hides what a role cannot do; the database refuses it anyway.

## Flows

**Sign-up (public).** Email + password + name (+ company). Always creates a
`customer`. Email is unique (Supabase Auth). Password: more than 8 characters,
with an uppercase letter, a lowercase letter and a special character, checked
in the form and in the server action. Supabase Auth enforces the minimum
length (9); its character presets that include symbols also force a digit,
which the brief does not ask for, so the character rules are ours.
Email confirmation is on, which is also what stops someone claiming a
pre-existing customer record by signing up with its email.

**Sign-in.** Email + password. Staff and admin land on `/dashboard`;
customers land on `/portal`.

**Forgot password.** `resetPasswordForEmail` with a redirect to
`/auth/callback?next=/auth/reset`, which sets the new password with the same rules. Mail goes
through custom SMTP so it reaches any address, not only team members.

**Adding staff (admin only).** Server action checks the caller is admin, then
creates the user with the service key, `app_metadata.role = 'staff'` and a
first password the admin picks (same rules). The role is set at creation, so
the sign-up trigger makes a staff profile and no customer record. They change
the password with Forgot password. An emailed invite was ruled out: its link
carries the session in the URL fragment, which the server callback can't read.

**Session.** Cookie-based via `@supabase/ssr`. `src/proxy.ts` refreshes it on
every request and redirects signed-out visitors to `/login?next=…`. Pages
re-check the role on the server before rendering.

## Rules for writing access code

- Every new table gets RLS enabled and policies in the same migration.
- Every policy is checked as each role: one allowed case and one refused case.
- The service key is used only in `src/lib/supabase/server.ts`
  (`createServiceClient`) and only after a server-side role check.
