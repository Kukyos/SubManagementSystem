# Progress

Newest first. What shipped, decisions taken, and anything moved or deleted.

## 2026-10-31

- Signed-in shells line up: the portal header and page share one 1440px
  container (the landing's width) instead of a narrower 1152px one that left
  wide black margins, with the nav beside the logo. Console header and page
  share the same gutters. Settings puts Team and Taxes side by side on wide
  screens; portal profile puts billing details beside the password card.
  Layout markup moved from `(app)/layout.tsx` and `portal/layout.tsx` into
  `components/layout/console-shell.tsx` and `portal-shell.tsx`; the layouts
  keep the role check.
- Customer portal: overview with balance and pause / resume / cancel (cancel
  asks twice), invoices with the same printable document as the console
  (moved to `components/sales/invoice-document.tsx`), plans with one-step
  subscribe, and profile. Drafts never show in the portal.
- **Decision: Stripe instead of Razorpay** for online payment (T2.8).
- **Decision: no chart library.** The dashboard's charts are hand-drawn SVG
  (`components/reports/bar-chart.tsx`): grouped monthly bars with a hover
  tooltip and a table view. Invoiced is the accent violet, collected a darker
  teal (`#1fa982`); the brighter brand teal fails the lightness band for chart
  fills on the dark surface.
- Billing run page, payments list with overdue aging, finance dashboard.
- **Decision: `billing_runs` table.** `run_billing` logs every run (console
  or nightly) so the billing page can show history; migration
  `20261031063429_billing_runs.sql`.
- Quotation templates, taxes in Settings, discounts with attach / detach on
  subscriptions. Seeded four templates and six discounts.
- Seed (`supabase/seed.sql`): nine more products with variants, ten more
  plans (monthly, yearly, quarterly, a weekly trial that closes itself), 688
  customers across ten cities, ~2,100 subscriptions over 18 months. Invoices
  come from `bill_subscription` itself, so they follow the real rules; then
  ~96% of past-due invoices are paid, a few part paid, the rest overdue.
  Timeline entries are moved back to when each event happened. Emails use the
  reserved `.example` domain so reminder mail can never reach a real inbox.
- Customers, subscriptions, invoices and payments screens, and the team list
  with "add staff" in Settings. Walked the whole flow in the browser: new
  subscription, minimum-quantity refusal shown from the trigger, variant line,
  confirm, activate, bill now, confirm invoice, part payment, balance, invoice
  flips to Paid on its own.
- **Decision: database messages reach the screen.** Lifecycle and payment
  triggers raise `check_violation` with a sentence for people; actions pass
  those through and hide every other database error.
- **Decision: admin sets a first password for new staff** instead of an email
  invite (see `AUTH.md`).
- **Decision: line prices are computed on the server** (plan price for the
  plan's own product, list price otherwise, plus the variant's extra). The form
  never sends a price.
- Input and Select carry `w-full`; a width passed in needs `!` to win
  (`!w-40`). Fixed the filter selects on products and plans.

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

- Landing timings tightened: intro loader minimum 1.1s (was 1.7s) with a
  shorter hold and fade, its counter written to the DOM instead of
  re-rendering React each frame, and the hero lead and buttons follow the
  headline sooner. "Who it's for" cards dropped `backdrop-blur`, which was
  re-blurring the live canvas every frame; a darker fill keeps them legible.
  Measured on hardware GPU: 60fps steady, one dropped frame in a 6s full-page
  scroll.
- Shard field moved onto the GPU: positions, tumble, hover orbit, scatter
  and amber edges are computed in a vertex shader from instanced attributes
  written once; the CPU only updates a few uniforms per frame. Same look,
  but the main thread is free, so scrolling and CSS animations stop
  stuttering. Shaders are compiled up front under the intro loader.
- Landing nav links take the reference's hover: letters roll up one after
  another (18ms stagger) with a copy rolling in from below, and the colour
  eases from #9a9a9a to white over 0.5s. Screen readers get the plain label.
- Hero entrance follows the reference: each headline line and the eyebrow
  rise from behind a mask with a 4° tilt (`wipe` utility), staggered; the
  lead and buttons fade up after them.
- Landing intro loader, after the reference's: black screen, turning logo
  mark, "Your recurring revenue has a rhythm. Brightloop keeps it." wiping up,
  LOADING bottom left and a percentage bottom right, then Completed and a
  fade. It waits for fonts (at least 1.7s), shows once per browser session,
  never under reduced motion, and the hero's entrance is paused beneath it.
  An inline script in the page sets `data-intro` on `<html>` before paint so
  repeat visits don't flash it.
- Shard field follows the reference's own mechanics (read from its shipped
  shader): shards near the pointer orbit their spot and swell up to 1.75×,
  mouse speed swings the orbit wider along the flick and widens the reach,
  and the pointer follows with easing. The ambient floaters are now their own
  layer of ~250 larger, dimmer shards that slide against the pointer with
  depth parallax. This replaces the camera turn and the white hover glow; the
  reference has neither.
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
