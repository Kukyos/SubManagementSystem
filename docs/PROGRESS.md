# Progress

Newest first. What shipped, decisions taken, and anything moved or deleted.

## 2026-10-31

### Where things stand (read this first in a new session)

- **Live:** the landing page at https://managesubs.vercel.app, plus sign in,
  sign up, forgot password and reset (`/login`, `/signup`,
  `/forgot-password`, `/auth/reset`). Email links land on `/auth/callback`.
  Products (`/products`, `/products/[id]`) on `main`.
- **Built and ready to use:**
  - design tokens in `src/app/globals.css`
  - UI primitives in `src/components/ui/`: `Button`, `ButtonLink`,
    `SubscriptionBadge`, `InvoiceBadge`, `Card`, `Stat`, `Field`, `Input`,
    `Select`, `Textarea`, `PageHeader`, `EmptyState`
  - logo, status colours (`src/lib/status.ts`), money and date formatting
    (`src/lib/format.ts`)
  - typed Supabase clients and generated DB types (`src/types/database.ts`,
    aliases in `models.ts`)
  - `getCurrentUser` / `requireRole` / `signOut`, plus the auth actions
    (`signIn`, `signUp`, `requestPasswordReset`, `updatePassword`) and the
    password rules in `src/lib/password.ts`
- **Shells:** console (`src/app/(app)/`, admin and staff) and portal
  (`src/app/portal/`, customers) both check the role on the server. Every
  screen has a stub page. Building a screen means replacing its stub and
  adding its service.
- **Database:** live and tested (see below). Seed (S7) started: demo admin
  and staff (`cleochariaofficial+admin@` / `+staff@gmail.com`), four GST
  rates (18% default, 12, 5, exempt) and one product. One test customer from
  checking sign-up.
- **Waiting on the user:** Razorpay test keys (T2.8).

### Log

- Shard background turns slightly with the pointer: the camera orbits the
  scene up to ~10° at the left and right edges (barely at all near the
  centre) and eases back when the pointer leaves the window.
- Plans page: list (product, billing cycle, availability window, active
  subscriptions, price) and one-form editor with the plan rules as
  checkboxes. Unticking "available" archives a plan. Paging is a shared
  `Pager` in `components/ui/`. Product pickers keep a product that has been
  archived since it was chosen, so saving doesn't clear it.
- Products page: list with search, active / archived filter and paging;
  editor with variants (base + extra price shown per variant), archive and
  restore. Staff see it read-only, with cost. Catalogue writes check for admin
  in the action as well as in RLS, because RLS turns a staff write into a
  silent no-op. Products are inserted or updated, never upserted (an upsert
  reads `cost_price`). Reads in `services/catalogue.ts`, Server Actions in
  `services/catalogue-actions.ts`, same split as auth.
- Console error boundary (`src/app/(app)/error.tsx`) for any screen whose
  data fails to load.
- Shard hover: hot shards now circle their own spot on small orbits (each on
  its own tilted plane, speed and direction) instead of jittering, and the
  hover radius is wider (2 scene units).
- Tried a sparser, patchy loop (~2,800 shards); reverted, the even 5,200
  read better.
- Auth pages: sign in, sign up, forgot password, choose a new password. They
  share the landing scene, with the loop on the right and the form where the
  headline was. Password rules (more than 8 characters, upper, lower, special)
  live in `src/lib/password.ts`: the form checks them with a native `pattern`
  and the server action checks them again. Signing up with an email that
  already has an account says so (the brief wants one account per email).
  `/auth/callback` handles both `?code=` and `?token_hash=` links.
- **Decision: Gmail SMTP instead of Resend.** Supabase Auth sends through a
  Gmail app password (custom SMTP, set in the dashboard), and invoice mail
  will use the same account. Env names are `SMTP_*` in `.env.example`.
- Commit rule simplified: one commit per page or fix, pushed when it's done.
- Shard hover no longer parts the loop: shards under the pointer stay in
  place and spin fast and jitter instead, so the agitation follows the cursor
  without opening a hole in the shape.
- Shard loop follows the reference's hover more closely: shards under the
  pointer push outward and turn white, then cool back over about a second;
  shards edge-on to the camera turn amber so the outline holds at any angle.
  Count raised to ~5,200 (1,600 on small screens) with smaller shards. Hover
  is off under reduced motion. Done in the Builder's file with their OK.
- Landing page: a three.js field of ~2,600 wireframe tetrahedra (1,100 on
  small screens). They hold a loop in the hero, scatter over the "billing
  month today" lines, and re-form for the features. Section poses come from
  `data-shards` attributes. The scene pauses in background tabs and stays
  still under reduced motion. three.js is imported inside the effect, so it
  stays out of the first bundle.
- **Decision: Geist instead of PP Neue Montreal** (the reference's font is
  paid). Same sizes and weights.
- Supabase advisor reports nine `security definer` functions callable by
  signed-in users. All are intentional: each checks the caller's role itself.
- Applied the three migrations to Supabase and renamed the files to the
  versions Supabase recorded, so the GitHub integration treats them as already
  applied.
- Checked the billing rules against the live database (in a rolled-back
  transaction): illegal transitions refused, missed periods caught up, re-run
  bills nothing twice, variant extra price, product discount stopping at its
  usage limit, GST on the discounted amount, partial then full payment
  flipping the invoice to paid, overpayment refused.
- Live at https://managesubs.vercel.app.
- Scaffolded Next.js 16 (App Router, TypeScript, Tailwind v4) with Supabase
  SSR clients and `src/proxy.ts` for session refresh and the signed-out
  redirect.
- **Decision: Cache Components off.** Almost every screen reads the session;
  dynamic rendering keeps the code simple and is fast enough with indexed,
  paginated queries.
- **Decision: business rules in Postgres.** Subscription and invoice
  lifecycles, the one-invoice-per-period guard, payment roll-up, discounts and
  the billing run are triggers and functions, so every path through the app
  (and pg_cron) gets them.
- **Decision: customers are separate from logins.** Staff can create a
  customer before that person ever signs up; sign-up links them by email.
- **Decision: cost price hidden from customers** with column-level grants;
  staff read it through `product_costs()`.
- Wrote the core schema and the access / billing migrations.
- Rewrote `HACKATHON_PLAN.md` for this build; added the docs set.
